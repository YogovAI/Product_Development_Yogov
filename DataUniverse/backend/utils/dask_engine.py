import dask.dataframe as dd
from dask.distributed import Client
import logging
from typing import Dict, Any, List, Optional
from .etl_engine import ETLEngine

logger = logging.getLogger(__name__)

class DaskEngine:
    """
    Parallel ETL Engine using Dask for large scale datasets
    """
    
    def __init__(self, scheduler_url: Optional[str] = None):
        try:
            self.client = Client(scheduler_url) if scheduler_url else Client(n_workers=2, threads_per_worker=2)
            logger.info(f"Dask Client initialized: {self.client}")
        except Exception as e:
            logger.error(f"Failed to initialize Dask Client: {e}")
            raise

    async def run_job(self, source_path: str, file_type: str, config: Dict[str, Any]):
        """
        Run ETL job using Dask
        """
        try:
            # Read data using Dask
            if file_type == 'csv':
                ddf = dd.read_csv(source_path)
            elif file_type == 'parquet':
                ddf = dd.read_parquet(source_path)
            else:
                raise ValueError(f"Dask conversion for {file_type} not implemented")

            # Apply DQ rules (Dask version)
            if "data_quality" in config:
                ddf = self.apply_quality_rules(ddf, config["data_quality"])

            # Apply transformations
            if "transformations" in config:
                ddf = self.apply_transformations(ddf, config["transformations"])

            # Execution is lazy, .compute() would happen when saving to target
            return ddf

        except Exception as e:
            logger.error(f"Error in Dask job: {e}")
            raise

    def apply_quality_rules(self, ddf: dd.DataFrame, rules_config: Dict[str, Any]) -> dd.DataFrame:
        """Apply DQ rules to Dask DataFrame"""
        # Logic similar to ETLEngine but using ddf.map_partitions or built-in dask methods
        # For simplicity, we can reuse logic or implement dask-specific optimizations
        rules = rules_config.get("rules", [])
        for rule in rules:
            col = rule.get("column")
            check = rule.get("check")
            if check == "not_null":
                ddf = ddf[ddf[col].notnull()]
            elif check == "unique":
                ddf = ddf.drop_duplicates(subset=[col])
        return ddf

    def apply_transformations(self, ddf: dd.DataFrame, transforms: List[Dict[str, Any]]) -> dd.DataFrame:
        """Apply business logic to Dask DataFrame"""
        for ts in transforms:
            logic = ts.get("logic")
            target_col = ts.get("target_column")
            t_type = ts.get("type")

            if t_type == "expression":
                # Dask supports some simple expressions, but we might need map_partitions for complex ones
                # For basic expressions:
                try:
                    ddf[target_col] = ddf.map_partitions(lambda df: df.eval(logic))
                except:
                    logger.warning(f"Dask native eval failed for {logic}, skipping or using fallback")
            
            elif t_type == "built_in":
                if logic == "trim_and_uppercase":
                    ddf[target_col] = ddf[target_col].str.strip().str.upper()
        
        return ddf

    def __del__(self):
        if hasattr(self, 'client'):
            self.client.close()
