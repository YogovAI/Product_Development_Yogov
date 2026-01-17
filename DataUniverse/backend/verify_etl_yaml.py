import pandas as pd
import yaml
import sys
import os
from pathlib import Path

# Add backend to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.utils.etl_engine import ETLEngine

def test_engine():
    print("--- Testing ETL Engine ---")
    
    # 1. Sample Data
    data = {
        "id": [1, 2, 3, 4],
        "name": [" john ", "jane", " bob", "alice "],
        "email": ["john@example.com", "jane@invalid", "bob@example.com", "alice@example.com"],
        "age": [30, 28, -5, 32],
        "salary": [75000, 68000, 82000, 71000]
    }
    df = pd.DataFrame(data)
    print("Initial Data:")
    print(df)
    
    # 2. YAML Config
    yaml_config = """
version: "1.0"
source:
  type: dummy
target:
  type: dummy
data_quality:
  on_failure: "quarantine"
  rules:
    - column: "age"
      check: "range"
      min: 0
      max: 120
      message: "Age out of range"
    
    - column: "email"
      check: "regex"
      pattern: '^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-.]+$'
      message: "Invalid email"

transformations:
  - name: "calculate_bonus"
    type: "expression"
    logic: "salary * 0.1"
    target_column: "bonus"

  - name: "clean_names"
    type: "built_in"
    logic: "trim_and_uppercase"
    target_column: "name"

  - name: "categorize_age"
    type: "python"
    logic: |
      def transform(row):
          if row['age'] >= 30:
              return 'Senior'
          return 'Junior'
    target_column: "seniority"
"""
    
    config = ETLEngine.load_config(yaml_config)
    
    # 3. Apply DQ Rules
    print("\nApplying DQ Rules (on_failure=quarantine)...")
    df_clean = ETLEngine.apply_quality_rules(df.copy(), config["data_quality"])
    print("Clean Data (expecting rows with invalid age and email to be removed):")
    print(df_clean)
    
    # 4. Apply Transformations
    print("\nApplying Transformations...")
    df_transformed = ETLEngine.apply_transformations(df_clean, config["transformations"])
    print("Transformed Data:")
    print(df_transformed)
    
    # Assertions
    assert len(df_clean) == 2 # Only John (1) and Alice (4) are valid. Jane has invalid email, Bob has invalid age.
    assert "bonus" in df_transformed.columns
    assert df_transformed.iloc[0]["name"] == "JOHN"
    assert df_transformed.iloc[0]["seniority"] == "Senior"
    
    print("\nVerification Successful!")

if __name__ == "__main__":
    test_engine()
