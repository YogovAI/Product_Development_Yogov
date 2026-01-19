import yaml
import pandas as pd
import re
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class ETLEngine:
    """
    Declarative ETL Engine that processes YAML configurations
    """
    
    @staticmethod
    def load_config(yaml_content: str) -> Dict[str, Any]:
        """Parse and validate YAML configuration"""
        try:
            config = yaml.safe_load(yaml_content)
            # Basic validation
            required_keys = ["source", "target"]
            for key in required_keys:
                if key not in config:
                    raise ValueError(f"Missing required configuration key: {key}")
            return config
        except Exception as e:
            logger.error(f"Error parsing ETL YAML: {e}")
            raise

    @staticmethod
    def apply_quality_rules(df: pd.DataFrame, rules_config: Dict[str, Any]) -> pd.DataFrame:
        """
        Apply data quality rules to the DataFrame
        """
        on_failure = rules_config.get("on_failure", "warn")
        rules = rules_config.get("rules", [])
        
        errors = []
        
        for rule in rules:
            col = rule.get("column")
            check = rule.get("check")
            msg = rule.get("message", f"Failed check {check} on {col}")
            
            if col not in df.columns:
                logger.warning(f"Column {col} not found for DQ rule {check}")
                continue

            if check == "not_null":
                mask = df[col].isnull()
                if mask.any():
                    errors.append((col, msg, mask))

            elif check == "range":
                min_val = rule.get("min")
                max_val = rule.get("max")
                if min_val is not None:
                    mask = df[col] < min_val
                    if mask.any():
                        errors.append((col, f"{msg} (min={min_val})", mask))
                if max_val is not None:
                    mask = df[col] > max_val
                    if mask.any():
                        errors.append((col, f"{msg} (max={max_val})", mask))

            elif check == "regex":
                pattern = rule.get("pattern")
                if pattern:
                    # Convert to string for regex check
                    mask = ~df[col].astype(str).str.match(pattern)
                    if mask.any():
                        errors.append((col, msg, mask))

            elif check == "unique":
                mask = df.duplicated(subset=[col], keep=False)
                if mask.any():
                    errors.append((col, msg, mask))

        if errors:
            for col, msg, mask in errors:
                failed_count = mask.sum()
                logger.error(f"DQ Failure: {msg} - {failed_count} rows affected")
            
            if on_failure == "halt":
                raise ValueError(f"ETL halted due to Data Quality failures: {errors[0][1]}")
            elif on_failure == "quarantine":
                # For now, we just log and exclude failed rows if quarantine is desired
                # In a real app, we'd write these to a separate table
                total_mask = pd.Series(False, index=df.index)
                for _, _, mask in errors:
                    total_mask = total_mask | mask
                logger.info(f"Quarantining {total_mask.sum()} rows")
                return df[~total_mask]
        
        return df

    @staticmethod
    def apply_transformations(df: pd.DataFrame, transforms: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Apply business logic transformations
        """
        for ts in transforms:
            name = ts.get("name")
            t_type = ts.get("type")
            logic = ts.get("logic")
            target_col = ts.get("target_column")
            
            logger.info(f"Applying transformation: {name} ({t_type})")
            
            try:
                if t_type == "expression":
                    # Use pandas eval for simple expressions
                    df[target_col] = df.eval(logic)
                
                elif t_type == "python":
                    # Use exec to define a function and apply it
                    # Warning: Use with caution in production
                    namespace = {}
                    exec(logic, namespace)
                    if 'transform' in namespace:
                        df[target_col] = df.apply(namespace['transform'], axis=1)
                    else:
                        logger.error(f"Python transformation {name} missing 'transform(row)' function")

                elif t_type == "built_in":
                    if logic == "trim_and_uppercase":
                        df[target_col] = df[target_col or df.columns[0]].astype(str).str.strip().str.upper()
                    elif logic == "trim":
                        df[target_col] = df[target_col or df.columns[0]].astype(str).str.strip()
                
            except Exception as e:
                logger.error(f"Error in transformation {name}: {e}")
                raise
        
        return df

    @staticmethod
    def apply_template_config(df: pd.DataFrame, template_config: Dict[str, Any]) -> pd.DataFrame:
        """
        Apply TransformTemplate.config to a DataFrame.

        Supported (initial):
        - Column split: col.transform = { op: 'split', source_column, delimiter, outputs: [{name,index,cast}] }
        - Type casting: col.data_type (basic) or col.constraints.pg_type == 'INTEGER'
        - Not-null enforcement: col.quality_rules.not_null / col.constraints.not_null
        """
        cols = (template_config or {}).get("columns", [])
        for col in cols:
            transform = (col or {}).get("transform")
            if transform and transform.get("op") == "split":
                source_col = transform.get("source_column")
                delim = transform.get("delimiter", "/")
                outputs = transform.get("outputs", [])
                if source_col and source_col in df.columns:
                    parts = df[source_col].astype(str).str.split(delim, expand=True)
                    for out in outputs:
                        name = out.get("name")
                        idx = out.get("index")
                        cast = out.get("cast")
                        if name is None or idx is None:
                            continue
                        df[name] = parts[idx]
                        if cast == "int":
                            df[name] = pd.to_numeric(df[name], errors="coerce").round().astype("Int64")
                        elif cast == "float":
                            df[name] = pd.to_numeric(df[name], errors="coerce")
                continue

            # Basic casting for declared integer-like columns
            constraints = (col or {}).get("constraints", {})
            pg_type = (constraints or {}).get("pg_type")
            if pg_type in ["INTEGER", "BIGINT"]:
                name = col.get("name")
                if name and name in df.columns:
                    # Safely convert to numeric, then to Int64 (nullable integer)
                    # We use round() to avoid "non-equivalent" errors if there are small floating point errors
                    numeric_series = pd.to_numeric(df[name], errors="coerce")
                    df[name] = numeric_series.round().astype("Int64")

        return df

    @staticmethod
    def apply_column_mappings(df: pd.DataFrame, mappings: List[Dict[str, str]]) -> pd.DataFrame:
        """
        Rename columns based on source-to-target mapping.
        Format: [{'source': 'col_a', 'target': 'col_1'}, ...]
        """
        if not mappings:
            return df
        
        rename_map = {str(m.get('source')): str(m.get('target')) for m in mappings if m.get('source') and m.get('target')}
        # Filter map: only keep items where source col exists in df
        actual_rename = {k: v for k, v in rename_map.items() if k in df.columns}
        logger.info(f"Applying column renames: {actual_rename}")
        return df.rename(columns=actual_rename)
