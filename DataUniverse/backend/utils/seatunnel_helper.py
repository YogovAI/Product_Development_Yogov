import json
from typing import Dict, Any, List

class SeaTunnelHelper:
    """
    Helper to generate Apache SeaTunnel (V2) configuration files
    """
    
    @staticmethod
    def generate_config(source_config: Dict[str, Any], target_config: Dict[str, Any], mapping: List[Dict[str, Any]], transform_template: Dict[str, Any] = None) -> str:
        """
        Generate HOCON configuration for SeaTunnel
        """
        config = {
            "env": {
                "execution.parallelism": 1,
                "job.mode": "BATCH"
            },
            "source": [
                SeaTunnelHelper._map_source(source_config)
            ],
            "transform": SeaTunnelHelper._map_transforms(mapping, transform_template),
            "sink": [
                SeaTunnelHelper._map_target(target_config)
            ]
        }
        
        # In a real scenario, we'd convert this dict to HOCON string
        # For now, we return as JSON string which SeaTunnel also supports in some versions or can be converted
        return json.dumps(config, indent=2)

    @staticmethod
    def _map_source(src: Dict[str, Any]) -> Dict[str, Any]:
        s_type = src.get("source_type")
        details = src.get("connection_details", {})
        
        if s_type == "Flat Files":
            return {
                "LocalFile": {
                    "path": details.get("Source File Path"),
                    "type": details.get("Source File Type", "csv"),
                    "schema": {
                        "fields": details.get("schema", {})
                    }
                }
            }
        elif "postgres" in str(src.get("type")).lower():
            return {
                "Jdbc": {
                    "url": f"jdbc:postgresql://{details.get('host')}:{details.get('port')}/{details.get('database')}",
                    "driver": "org.postgresql.Driver",
                    "user": details.get("user"),
                    "password": details.get("password"),
                    "query": f"SELECT * FROM {details.get('table')}"
                }
            }
        return {"UnknownSource": {}}

    @staticmethod
    def _map_target(tgt: Dict[str, Any]) -> Dict[str, Any]:
        t_type = tgt.get("source_type")
        details = tgt.get("connection_details", {})
        
        if t_type == "Datalake/Lakehouse":
            return {
                "S3File": {
                    "bucket": details.get("bucket"),
                    "path": details.get("path"),
                    "sink_columns": [],
                    "access_key": details.get("Access Key"),
                    "secret_key": details.get("Secret Key"),
                    "endpoint": details.get("Endpoint URL"),
                    "file_format_type": "parquet"
                }
            }
        return {"Console": {}}

    @staticmethod
    def _map_transforms(mapping: List[Dict[str, Any]], template: Dict[str, Any]) -> List[Dict[str, Any]]:
        transforms = []
        
        # sql transform for field mapping
        if mapping:
            select_clause = ", ".join([f"{m['source']} AS {m['target']}" for m in mapping if m['source'] and m['target']])
            transforms.append({
                "Sql": {
                    "query": f"SELECT {select_clause} FROM SOURCE_TABLE"
                }
            })
            
        # Add DQ/Business rules from template if exists
        if template and "columns" in template:
            # SeaTunnel has specific transform plugins like 'Replace', 'Split', 'Sql'
            # We can map our rules to SeaTunnel SQL transforms
            pass
            
        return transforms
