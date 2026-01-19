"""
File readers for different data source types
Supports CSV, JSON, and other flat file formats
"""
import pandas as pd
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class FileReader:
    """Base class for file readers"""
    
    @staticmethod
    def read_csv(file_path: str) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Read CSV file and infer schema
        Returns: (DataFrame, schema_dict)
        """
        try:
            df = pd.read_csv(file_path)
            schema = FileReader._infer_schema(df)
            return df, schema
        except Exception as e:
            logger.error(f"Error reading CSV file {file_path}: {e}")
            raise
    
    @staticmethod
    def read_json(file_path: str) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Read JSON file and infer schema
        Returns: (DataFrame, schema_dict)
        """
        try:
            df = pd.read_json(file_path)
            schema = FileReader._infer_schema(df)
            return df, schema
        except Exception as e:
            logger.error(f"Error reading JSON file {file_path}: {e}")
            raise
    
    @staticmethod
    def read_excel(file_path: str, sheet_name: str = 0) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Read Excel file and infer schema
        Returns: (DataFrame, schema_dict)
        """
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            schema = FileReader._infer_schema(df)
            return df, schema
        except Exception as e:
            logger.error(f"Error reading Excel file {file_path}: {e}")
            raise
    
    @staticmethod
    def _infer_schema(df: pd.DataFrame) -> Dict[str, str]:
        """
        Infer PostgreSQL column types from pandas DataFrame
        Returns: dict of {column_name: postgres_type}
        """
        type_mapping = {
            'int64': 'BIGINT',
            'int32': 'INTEGER',
            'float64': 'DOUBLE PRECISION',
            'float32': 'REAL',
            'object': 'TEXT',
            'bool': 'BOOLEAN',
            'datetime64[ns]': 'TIMESTAMP',
            'timedelta64[ns]': 'INTERVAL'
        }
        
        schema = {}
        for column in df.columns:
            dtype = str(df[column].dtype)
            postgres_type = type_mapping.get(dtype, 'TEXT')
            
            # For object types, check if it's actually numeric
            if dtype == 'object':
                try:
                    pd.to_numeric(df[column])
                    postgres_type = 'DOUBLE PRECISION'
                except:
                    # Check max length for VARCHAR optimization
                    max_len = df[column].astype(str).str.len().max()
                    if max_len and max_len < 255:
                        postgres_type = f'VARCHAR({max(max_len, 50)})'
                    else:
                        postgres_type = 'TEXT'
            
            schema[column] = postgres_type
        
        return schema
    
    @staticmethod
    def read_file(file_path: str, file_type: str) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Read file based on type
        Returns: (DataFrame, schema_dict)
        """
        file_type = file_type.lower()
        
        if file_type in ['csv', 'text/csv']:
            return FileReader.read_csv(file_path)
        elif file_type in ['json', 'application/json']:
            return FileReader.read_json(file_path)
        elif file_type in ['excel', 'xlsx', 'xls']:
            return FileReader.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def get_iterator(file_path: str, file_type: str, chunk_size: int = 10000):
        """
        Get an iterator for the file content in chunks
        """
        file_type = file_type.lower()
        if file_type in ['csv', 'text/csv']:
            return pd.read_csv(file_path, chunksize=chunk_size)
        elif file_type in ['json', 'application/json']:
            # Note: pd.read_json only supports chunking for lines=True
            return pd.read_json(file_path, lines=True, chunksize=chunk_size)
        else:
            raise ValueError(f"Chunked reading not supported for type: {file_type}")
