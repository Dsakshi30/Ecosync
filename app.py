#!/usr/bin/env python3
"""
LTTS Fetcher - Backend Server with File Storage - COMPLETE FIXED VERSION
With full support for editing, deleting, and data persistence
"""

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import os
import pandas as pd
import json
import numpy as np
from pathlib import Path
from werkzeug.utils import secure_filename
import csv
import traceback
from datetime import datetime
import uuid
import time
from typing import Dict, List, Any, Optional

app = Flask(__name__)

# Configure CORS properly
CORS(app, origins=["*"], supports_credentials=True)

# Directory paths
BASE_DIR = r"D:\Dirshak\Internships\5LTTS\Fetcher\Data"
DATASETS_DIR = os.path.join(BASE_DIR, "Datasets")
COMBINED_DB_PATH = os.path.join(BASE_DIR, "CombinedDB.csv")

# Create directories if they don't exist
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(DATASETS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

# Global cache for performance with improved settings
_data_cache = {
    'combined_data': None,
    'last_update': 0,
    'cache_duration': 30,  # Increased from 5 to 30 seconds
    'file_mtime': 0,  # Track file modification time
    'hits': 0,
    'misses': 0
}

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def normalize_column_name(name: Any) -> str:
    """Normalize column names for comparison"""
    if pd.isna(name):
        return ""
    name_str = str(name).strip()
    return name_str.lower().replace(' ', '').replace('_', '').replace('-', '')

def clean_value_for_json(value: Any) -> Any:
    """Clean a single value for JSON serialization"""
    if value is None:
        return None
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(value)
    if isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, bool):
        return bool(value)
    if isinstance(value, str):
        # Return empty string as is, not None
        return value.strip()
    return str(value)

def clean_dataframe_for_json(df: pd.DataFrame) -> List[Dict]:
    """Clean DataFrame for JSON serialization - optimized version"""
    if df is None or len(df) == 0:
        return []
    
    # Replace NaN/inf with None
    df_clean = df.replace([np.inf, -np.inf], None)
    df_clean = df_clean.where(pd.notnull(df_clean), None)
    
    # Convert to records and clean each value
    records = []
    for _, row in df_clean.iterrows():
        record = {}
        for col in df_clean.columns:
            value = row[col]
            # IMPORTANT: Keep _id and _source as they are (even if null)
            if col in ['_id', '_source']:
                record[col] = value if value is not None else ''
            else:
                record[col] = clean_value_for_json(value)
        records.append(record)
    
    return records

def get_combined_df() -> pd.DataFrame:
    """Get combined DataFrame with intelligent caching"""
    global _data_cache

    current_time = time.time()

    # Check if file exists and get modification time
    if os.path.exists(COMBINED_DB_PATH):
        file_mtime = os.path.getmtime(COMBINED_DB_PATH)
    else:
        file_mtime = 0

    # Check cache validity: time-based and file modification-based
    cache_valid = (
        _data_cache['combined_data'] is not None and
        current_time - _data_cache['last_update'] < _data_cache['cache_duration'] and
        _data_cache['file_mtime'] == file_mtime
    )

    if cache_valid:
        _data_cache['hits'] += 1
        return _data_cache['combined_data']

    # Cache miss - need to reload
    _data_cache['misses'] += 1

    # Read from file
    if not os.path.exists(COMBINED_DB_PATH):
        _data_cache['combined_data'] = pd.DataFrame()
        _data_cache['last_update'] = current_time
        _data_cache['file_mtime'] = file_mtime
        return _data_cache['combined_data']

    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        df = None

        for encoding in encodings:
            try:
                df = pd.read_csv(COMBINED_DB_PATH, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue

        if df is None:
            print("ERROR: Could not read CSV with any encoding")
            return pd.DataFrame()

        # Ensure _id column exists for editing
        if '_id' not in df.columns:
            print("Adding _id column to combined data...")
            df['_id'] = [str(uuid.uuid4()) for _ in range(len(df))]
            df.to_csv(COMBINED_DB_PATH, index=False, encoding='utf-8')
            # Update file mtime after writing
            file_mtime = os.path.getmtime(COMBINED_DB_PATH)

        _data_cache['combined_data'] = df
        _data_cache['last_update'] = current_time
        _data_cache['file_mtime'] = file_mtime

        return df
    except Exception as e:
        print(f"Error reading combined data: {str(e)}")
        traceback.print_exc()
        return pd.DataFrame()

def invalidate_cache():
    """Invalidate data cache"""
    global _data_cache
    _data_cache['combined_data'] = None
    _data_cache['last_update'] = 0

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        datasets_count = 0
        if os.path.exists(DATASETS_DIR):
            datasets_count = len([f for f in os.listdir(DATASETS_DIR) if f.endswith('.csv')])
        
        combined_df = get_combined_df()
        combined_rows = len(combined_df)
        
        return jsonify({
            'status': 'ok',
            'base_dir': BASE_DIR,
            'datasets_count': datasets_count,
            'combined_rows': combined_rows,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    """List all datasets"""
    try:
        datasets = []
        
        if not os.path.exists(DATASETS_DIR):
            return jsonify([])
        
        for filename in os.listdir(DATASETS_DIR):
            if filename.endswith('.csv'):
                filepath = os.path.join(DATASETS_DIR, filename)
                dataset_name = os.path.splitext(filename)[0]
                
                try:
                    file_stats = os.stat(filepath)
                    # Efficient row count
                    with open(filepath, 'r', encoding='utf-8') as f:
                        row_count = sum(1 for _ in f) - 1  # Subtract header
                    
                    # Read just the header for column count
                    with open(filepath, 'r', encoding='utf-8') as f:
                        header = f.readline().strip()
                        column_count = len(header.split(',')) if header else 0
                    
                    datasets.append({
                        'name': dataset_name,
                        'filename': filename,
                        'rows': max(0, row_count),
                        'columns': column_count,
                        'size': file_stats.st_size
                    })
                except Exception as e:
                    print(f"Error reading {filename}: {str(e)}")
                    continue
        
        return jsonify(datasets)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/combined', methods=['GET'])
def get_combined_db():
    """Get combined database - FIXED VERSION"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] GET /api/combined")
        
        df = get_combined_df()
        
        if len(df) == 0:
            print(f"  Empty response: 0 rows")
            return Response('[]', mimetype='application/json', status=200)
        
        # Clean and prepare data
        data = clean_dataframe_for_json(df)
        print(f"  Sending {len(data)} rows")
        if len(data) > 0:
            print(f"  First row keys: {list(data[0].keys())}")
            print(f"  Has _id: {'_id' in data[0]}")
        
        # Serialize to JSON
        json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        
        return Response(json_str, mimetype='application/json', status=200)
        
    except Exception as e:
        print(f"\n✗ ERROR in get_combined_db: {str(e)}")
        traceback.print_exc()
        error = {'error': str(e)}
        return Response(json.dumps(error), mimetype='application/json', status=500)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/upload")
        
        if 'file' not in request.files:
            print("  ERROR: No file in request")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print("  ERROR: Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            print(f"  ERROR: Invalid file type: {file.filename}")
            return jsonify({'error': 'Invalid file type'}), 400
        
        filename = secure_filename(file.filename)
        dataset_name = os.path.splitext(filename)[0]
        
        print(f"  Processing: {filename}")
        
        # Read the file
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        print(f"  Loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Save as CSV
        csv_path = os.path.join(DATASETS_DIR, f"{dataset_name}.csv")
        df.to_csv(csv_path, index=False, encoding='utf-8')
        print(f"  Saved to: {csv_path}")
        
        # Update combined database
        update_combined_db()
        invalidate_cache()  # Clear cache
        
        print(f"  ✓ Upload successful")
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'dataset_name': dataset_name,
            'rows': len(df),
            'columns': list(df.columns)
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in upload: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/update-row', methods=['POST'])
def update_row():
    """Update a single row in the database - FIXED VERSION"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/update-row")
        
        data = request.json
        if not data:
            print("  ERROR: No JSON data")
            return jsonify({'error': 'No JSON data'}), 400
        
        print(f"  Request data keys: {list(data.keys())}")
        
        if 'rowId' not in data or 'updates' not in data:
            print(f"  ERROR: Missing required fields. Has rowId: {'rowId' in data}, Has updates: {'updates' in data}")
            return jsonify({'error': 'Invalid request data. Need rowId and updates'}), 400
        
        row_id = data['rowId']
        updates = data['updates']
        
        print(f"  Updating row ID: {row_id}")
        print(f"  Updates: {updates}")
        
        # Get current data
        df = get_combined_df()
        
        if len(df) == 0:
            print("  ERROR: Database empty")
            return jsonify({'error': 'Database is empty'}), 404
        
        # Check if _id column exists
        if '_id' not in df.columns:
            print("  ERROR: _id column not found")
            print(f"  Available columns: {list(df.columns)}")
            return jsonify({'error': 'Row IDs not found in data'}), 404
        
        # Find the row to update
        mask = df['_id'] == row_id
        if not mask.any():
            print(f"  ERROR: Row not found with ID: {row_id}")
            print(f"  Sample IDs: {df['_id'].head(5).tolist()}")
            return jsonify({'error': 'Row not found'}), 404
        
        # Apply updates
        row_index = df[mask].index[0]
        for column, value in updates.items():
            if column in df.columns and not column.startswith('_'):
                df.at[row_index, column] = value
                print(f"    Updated {column} = {value}")
        
        # Save updated data
        df.to_csv(COMBINED_DB_PATH, index=False, encoding='utf-8')
        invalidate_cache()  # Clear cache
        
        # Update individual datasets if needed
        if '_source' in df.columns:
            update_individual_datasets(df)
        
        print(f"  ✓ Row updated successfully")
        
        return jsonify({
            'success': True, 
            'message': 'Row updated successfully',
            'rowId': row_id
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in update_row: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-row', methods=['POST'])
def delete_row():
    """Delete a row from the database - FIXED VERSION"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/delete-row")
        
        data = request.json
        if not data:
            print("  ERROR: No JSON data")
            return jsonify({'error': 'No JSON data'}), 400
        
        print(f"  Request data: {data}")
        
        if 'rowId' not in data:
            print("  ERROR: Invalid request data - no rowId")
            return jsonify({'error': 'Invalid request data'}), 400
        
        row_id = data['rowId']
        print(f"  Deleting row ID: {row_id}")
        
        # Get current data
        df = get_combined_df()
        
        if len(df) == 0:
            print("  ERROR: Database empty")
            return jsonify({'error': 'Database is empty'}), 404
        
        # Check if _id column exists
        if '_id' not in df.columns:
            print("  ERROR: _id column not found")
            print(f"  Available columns: {list(df.columns)}")
            return jsonify({'error': 'Row IDs not found in data'}), 404
        
        # Find and delete the row
        original_length = len(df)
        df = df[df['_id'] != row_id]
        new_length = len(df)
        
        if original_length == new_length:
            print(f"  ERROR: Row not found with ID: {row_id}")
            print(f"  Sample IDs: {df['_id'].head(5).tolist()}")
            return jsonify({'error': 'Row not found'}), 404
        
        # Save updated data
        df.to_csv(COMBINED_DB_PATH, index=False, encoding='utf-8')
        invalidate_cache()  # Clear cache
        
        # Update individual datasets if needed
        if '_source' in df.columns:
            update_individual_datasets(df)
        
        print(f"  ✓ Row deleted. Before: {original_length}, After: {new_length}")
        
        return jsonify({
            'success': True, 
            'message': 'Row deleted successfully',
            'deleted': True
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in delete_row: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/combined', methods=['POST'])
def save_combined_db():
    """Save entire combined database (for bulk updates)"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/combined (bulk save)")
        
        data = request.json
        
        if not data:
            print("  ERROR: No data provided")
            return jsonify({'error': 'No data provided'}), 400
        
        print(f"  Saving {len(data)} rows")
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Ensure _id column exists
        if '_id' not in df.columns:
            print("  Adding _id column to new data")
            df['_id'] = [str(uuid.uuid4()) for _ in range(len(df))]
        
        # Save to CSV
        df.to_csv(COMBINED_DB_PATH, index=False, encoding='utf-8')
        invalidate_cache()  # Clear cache
        
        # Update individual datasets
        if '_source' in df.columns:
            update_individual_datasets(df)
        
        print(f"  ✓ Saved {len(df)} rows successfully")
        
        return jsonify({
            'success': True, 
            'message': 'Saved successfully', 
            'rows': len(df)
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in save_combined_db: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def update_individual_datasets(combined_df: pd.DataFrame):
    """Update individual dataset files based on combined data"""
    try:
        if '_source' not in combined_df.columns:
            print("  WARNING: No _source column in combined data")
            return
        
        # Get unique sources
        sources = combined_df['_source'].dropna().unique()
        
        print(f"  Updating {len(sources)} individual datasets")
        
        for source in sources:
            if not source:
                continue
            
            # Filter rows for this source
            source_mask = combined_df['_source'] == source
            source_data = combined_df[source_mask].copy()
            
            # Drop metadata columns
            cols_to_drop = [col for col in ['_source', '_id'] if col in source_data.columns]
            if cols_to_drop:
                source_data = source_data.drop(columns=cols_to_drop)
            
            # Save to dataset file
            dataset_path = os.path.join(DATASETS_DIR, f"{source}.csv")
            source_data.to_csv(dataset_path, index=False, encoding='utf-8')
            
            print(f"    Updated {source}: {len(source_data)} rows")
    
    except Exception as e:
        print(f"  ERROR updating individual datasets: {str(e)}")
        traceback.print_exc()

@app.route('/api/dataset/<dataset_name>', methods=['DELETE'])
def delete_dataset(dataset_name: str):
    """Delete a dataset - FIXED VERSION"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] DELETE /api/dataset/{dataset_name}")
        
        # Handle URL encoded dataset names
        dataset_name = dataset_name.strip()
        filepath = os.path.join(DATASETS_DIR, f"{dataset_name}.csv")
        
        print(f"  Attempting to delete: {filepath}")
        print(f"  File exists: {os.path.exists(filepath)}")
        
        if not os.path.exists(filepath):
            print(f"  ERROR: Dataset file not found: {filepath}")
            return jsonify({'error': 'Dataset not found'}), 404
        
        # Delete the dataset file
        os.remove(filepath)
        print(f"  Deleted: {filepath}")
        
        # Update combined database
        update_combined_db()
        invalidate_cache()  # Clear cache
        
        print(f"  ✓ Dataset deleted successfully")
        
        return jsonify({
            'success': True, 
            'message': f'Dataset "{dataset_name}" deleted successfully'
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in delete_dataset: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets/delete-all', methods=['POST'])
def delete_all_datasets():
    """Delete all datasets"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/datasets/delete-all")
        
        if not os.path.exists(DATASETS_DIR):
            print("  ERROR: Datasets directory not found")
            return jsonify({'error': 'Datasets directory not found'}), 404
        
        # Count files before deletion
        files = [f for f in os.listdir(DATASETS_DIR) if f.endswith('.csv')]
        count = len(files)
        
        print(f"  Deleting {count} dataset files")
        
        # Delete all dataset files
        deleted_count = 0
        for filename in files:
            filepath = os.path.join(DATASETS_DIR, filename)
            try:
                os.remove(filepath)
                deleted_count += 1
                print(f"    Deleted: {filename}")
            except Exception as e:
                print(f"    ERROR deleting {filename}: {e}")
                continue
        
        # Create empty combined DB
        pd.DataFrame().to_csv(COMBINED_DB_PATH, index=False)
        invalidate_cache()  # Clear cache
        
        print(f"  ✓ Deleted {deleted_count}/{count} files")
        
        return jsonify({
            'success': True, 
            'message': f'All datasets deleted ({deleted_count} files)',
            'deleted_count': deleted_count
        })
    
    except Exception as e:
        print(f"\n✗ ERROR in delete_all_datasets: {str(e)}")
        return jsonify({'error': str(e)}), 500

def update_combined_db():
    """Update combined database from all datasets - FIXED VERSION"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Updating combined database...")
        
        if not os.path.exists(DATASETS_DIR):
            print("  WARNING: No datasets directory")
            pd.DataFrame().to_csv(COMBINED_DB_PATH, index=False)
            return
        
        csv_files = [f for f in os.listdir(DATASETS_DIR) if f.endswith('.csv')]
        
        if not csv_files:
            print("  WARNING: No CSV files found")
            pd.DataFrame().to_csv(COMBINED_DB_PATH, index=False)
            return
        
        print(f"  Found {len(csv_files)} dataset files")
        
        all_data = []
        column_mapping = {}
        
        # First pass: Collect all unique column names
        for filename in csv_files:
            filepath = os.path.join(DATASETS_DIR, filename)
            try:
                # Read just the first line to get column names
                with open(filepath, 'r', encoding='utf-8') as f:
                    first_line = f.readline().strip()
                    if first_line:
                        headers = [h.strip() for h in first_line.split(',')]
                        for col in headers:
                            if col:  # Skip empty columns
                                normalized = normalize_column_name(col)
                                if normalized and normalized not in column_mapping:
                                    column_mapping[normalized] = col
            except Exception as e:
                print(f"    ERROR reading headers from {filename}: {str(e)}")
                continue
        
        column_list = sorted([column_mapping[norm] for norm in column_mapping.keys()])
        normalized_to_original = {normalize_column_name(col): col for col in column_list}
        
        print(f"  Total unique columns: {len(column_list)}")
        if column_list:
            print(f"  Columns: {column_list}")
        
        # Second pass: Process data from each dataset
        for filename in csv_files:
            dataset_name = os.path.splitext(filename)[0]
            filepath = os.path.join(DATASETS_DIR, filename)
            
            try:
                # Read with multiple encoding attempts
                df = None
                encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
                
                for encoding in encodings:
                    try:
                        df = pd.read_csv(filepath, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                    except Exception as e:
                        print(f"    ERROR reading {filename} with {encoding}: {str(e)}")
                        continue
                
                if df is None:
                    print(f"    ERROR: Could not read {filename} with any encoding")
                    continue
                
                print(f"    Processing {dataset_name}: {len(df)} rows, {len(df.columns)} columns")
                
                # Create mapping for this dataset's columns
                dataset_cols = [str(c).strip() for c in df.columns if str(c).strip()]
                dataset_normalized_map = {}
                for col in dataset_cols:
                    normalized = normalize_column_name(col)
                    if normalized and normalized not in dataset_normalized_map:
                        dataset_normalized_map[normalized] = col
                
                # Process each row
                for _, row in df.iterrows():
                    normalized_row = {}
                    
                    for norm_master in normalized_to_original.keys():
                        orig_master = normalized_to_original[norm_master]
                        
                        if norm_master in dataset_normalized_map:
                            dataset_col = dataset_normalized_map[norm_master]
                            value = row[dataset_col]
                            normalized_row[orig_master] = value if pd.notna(value) else ''
                        else:
                            normalized_row[orig_master] = ''
                    
                    # Add metadata - ALWAYS include _id and _source
                    normalized_row['_source'] = dataset_name
                    normalized_row['_id'] = str(uuid.uuid4())
                    all_data.append(normalized_row)
                
            except Exception as e:
                print(f"    ERROR processing {filename}: {str(e)}")
                traceback.print_exc()
                continue
        
        print(f"  Total rows collected: {len(all_data)}")
        
        # Create and save combined DataFrame
        if all_data:
            final_columns = column_list + ['_source', '_id']
            combined_df = pd.DataFrame(all_data, columns=final_columns)
            combined_df.to_csv(COMBINED_DB_PATH, index=False, encoding='utf-8')
            print(f"  ✓ Saved combined DB: {len(combined_df)} rows, {len(combined_df.columns)} columns")
            print(f"  Has _id column: {'_id' in combined_df.columns}")
            print(f"  Has _source column: {'_source' in combined_df.columns}")
        else:
            pd.DataFrame().to_csv(COMBINED_DB_PATH, index=False)
            print("  ✓ Created empty combined DB")
        
        # Invalidate cache
        invalidate_cache()
    
    except Exception as e:
        print(f"\n✗ ERROR in update_combined_db: {str(e)}")
        traceback.print_exc()
        raise

@app.route('/api/search', methods=['POST'])
def search_data():
    """Search in combined database"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/search")

        search_params = request.json
        if not search_params:
            return Response('[]', mimetype='application/json')

        search_term = search_params.get('term', '').lower()
        fuzzy = search_params.get('fuzzy', True)

        print(f"  Search term: '{search_term}', Fuzzy: {fuzzy}")

        df = get_combined_df()

        if len(df) == 0 or not search_term:
            data = clean_dataframe_for_json(df)
            print(f"  Empty search result: {len(data)} rows")
            return Response(json.dumps(data), mimetype='application/json')

        # Columns to exclude from search
        excluded_columns = ['CEO', 'CTO', 'Networth', 'Sl. Number', 'Contact Person', 'unnamed']

        # Prepare string representation for searching, excluding certain columns
        df_str = df.astype(str).fillna('')

        # Get columns to search in (exclude metadata and specified columns)
        search_columns = [col for col in df_str.columns if col not in ['_source', '_id'] and col not in excluded_columns]

        if fuzzy:
            mask = df_str[search_columns].apply(
                lambda row: any(search_term in str(val).lower() for val in row),
                axis=1
            )
        else:
            mask = df_str[search_columns].apply(
                lambda row: any(
                    search_term == str(val).lower() or
                    f' {search_term} ' in f' {str(val).lower()} '
                    for val in row
                ),
                axis=1
            )

        results = df[mask]
        data = clean_dataframe_for_json(results)

        print(f"  Search results: {len(data)} rows")

        return Response(json.dumps(data), mimetype='application/json')

    except Exception as e:
        print(f"\n✗ ERROR in search_data: {str(e)}")
        error = {'error': str(e)}
        return Response(json.dumps(error), mimetype='application/json', status=500)

@app.route('/api/search-column', methods=['POST'])
def search_column():
    """Search in specific column"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/search-column")
        
        search_params = request.json
        if not search_params:
            return Response('[]', mimetype='application/json')
        
        search_term = search_params.get('term', '').lower()
        column = search_params.get('column', '')
        
        print(f"  Column search: '{search_term}' in '{column}'")
        
        if not search_term or not column:
            return Response('[]', mimetype='application/json')
        
        df = get_combined_df()
        
        if column not in df.columns or len(df) == 0:
            data = clean_dataframe_for_json(df)
            print(f"  Column not found or empty data")
            return Response(json.dumps(data), mimetype='application/json')
        
        mask = df[column].astype(str).str.lower().str.contains(search_term, na=False)
        results = df[mask]
        data = clean_dataframe_for_json(results)
        
        print(f"  Column search results: {len(data)} rows")
        
        return Response(json.dumps(data), mimetype='application/json')
    
    except Exception as e:
        print(f"\n✗ ERROR in search_column: {str(e)}")
        error = {'error': str(e)}
        return Response(json.dumps(error), mimetype='application/json', status=500)

@app.route('/api/rebuild-combined', methods=['POST'])
def rebuild_combined():
    """Force rebuild combined database"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] POST /api/rebuild-combined")
        
        update_combined_db()
        
        if os.path.exists(COMBINED_DB_PATH):
            df = pd.read_csv(COMBINED_DB_PATH, encoding='utf-8')
            print(f"  ✓ Rebuilt: {len(df)} rows")
            print(f"  Has _id: {'_id' in df.columns}")
            print(f"  Has _source: {'_source' in df.columns}")
            return jsonify({'success': True, 'rows': len(df)})
        else:
            print(f"  ✓ Rebuilt: 0 rows")
            return jsonify({'success': True, 'rows': 0})
    
    except Exception as e:
        print(f"\n✗ ERROR in rebuild_combined: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/combined', methods=['GET'])
def export_combined():
    """Export combined database"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] GET /api/export/combined")
        
        if not os.path.exists(COMBINED_DB_PATH):
            print("  ERROR: Combined DB not found")
            return jsonify({'error': 'Combined database not found'}), 404
        
        print(f"  Exporting combined DB")
        
        return send_file(
            COMBINED_DB_PATH,
            mimetype='text/csv',
            as_attachment=True,
            download_name='CombinedDB.csv'
        )
    except Exception as e:
        print(f"\n✗ ERROR in export_combined: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/dataset/<dataset_name>', methods=['GET'])
def export_dataset(dataset_name: str):
    """Export specific dataset"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] GET /api/export/dataset/{dataset_name}")
        
        filepath = os.path.join(DATASETS_DIR, f"{dataset_name}.csv")
        
        if not os.path.exists(filepath):
            print(f"  ERROR: Dataset not found: {dataset_name}")
            return jsonify({'error': 'Dataset not found'}), 404
        
        print(f"  Exporting dataset: {dataset_name}")
        
        return send_file(
            filepath,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f"{dataset_name}.csv"
        )
    except Exception as e:
        print(f"\n✗ ERROR in export_dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/combined', methods=['GET'])
def debug_combined_db():
    """Debug endpoint for combined database"""
    try:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] GET /api/debug/combined")
        
        if not os.path.exists(COMBINED_DB_PATH):
            print("  Combined DB file not found")
            return jsonify({'error': 'File not found'})
        
        file_stats = os.stat(COMBINED_DB_PATH)
        
        # Try multiple encodings
        df = None
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(COMBINED_DB_PATH, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            return jsonify({'error': 'Could not read file with any encoding'})
        
        debug_info = {
            'file_exists': True,
            'file_size': file_stats.st_size,
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': list(df.columns),
            'has_id_column': '_id' in df.columns,
            'has_source_column': '_source' in df.columns,
            'id_count': df['_id'].nunique() if '_id' in df.columns else 0,
            'first_row': clean_dataframe_for_json(df.head(1))[0] if len(df) > 0 else None
        }
        
        print(f"  Debug info: {debug_info}")
        
        return jsonify(debug_info)
        
    except Exception as e:
        print(f"\n✗ ERROR in debug_combined_db: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-edit', methods=['GET'])
def test_edit():
    """Test endpoint to verify edit functionality"""
    try:
        df = get_combined_df()
        
        if len(df) == 0:
            return jsonify({'error': 'No data available'})
        
        # Return first row's ID for testing
        first_row = df.iloc[0]
        test_data = {
            'row_id': first_row['_id'] if '_id' in df.columns else 'NO_ID',
            'has_id_column': '_id' in df.columns,
            'row_count': len(df),
            'columns': list(df.columns),
            'sample_data': clean_dataframe_for_json(df.head(2))
        }
        
        return jsonify(test_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-delete/<dataset_name>', methods=['GET'])
def test_delete_endpoint(dataset_name: str):
    """Test endpoint for dataset deletion"""
    try:
        filepath = os.path.join(DATASETS_DIR, f"{dataset_name}.csv")
        exists = os.path.exists(filepath)
        
        return jsonify({
            'dataset_name': dataset_name,
            'filepath': filepath,
            'exists': exists,
            'datasets_dir': DATASETS_DIR,
            'files_in_dir': os.listdir(DATASETS_DIR) if os.path.exists(DATASETS_DIR) else []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cache-stats', methods=['GET'])
def cache_stats():
    """Get cache performance statistics"""
    try:
        global _data_cache

        total_requests = _data_cache['hits'] + _data_cache['misses']
        hit_rate = (_data_cache['hits'] / total_requests * 100) if total_requests > 0 else 0

        stats = {
            'cache_enabled': True,
            'cache_duration_seconds': _data_cache['cache_duration'],
            'total_requests': total_requests,
            'cache_hits': _data_cache['hits'],
            'cache_misses': _data_cache['misses'],
            'hit_rate_percent': round(hit_rate, 2),
            'last_update_timestamp': _data_cache['last_update'],
            'file_modification_time': _data_cache['file_mtime'],
            'data_cached': _data_cache['combined_data'] is not None,
            'cached_rows': len(_data_cache['combined_data']) if _data_cache['combined_data'] is not None else 0,
            'cached_columns': len(_data_cache['combined_data'].columns) if _data_cache['combined_data'] is not None else 0,
            'timestamp': datetime.now().isoformat()
        }

        return jsonify(stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a simple test route
@app.route('/api/test', methods=['GET'])
def test_api():
    """Simple test endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'API is working',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

if __name__ == '__main__':
    print("=" * 70)
    print("LTTS FETCHER - BACKEND SERVER (COMPLETE EDITION/DELETE SUPPORT)")
    print("=" * 70)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Datasets Directory: {DATASETS_DIR}")
    print(f"Combined DB Path: {COMBINED_DB_PATH}")
    print("-" * 70)
    
    print("Initializing combined database...")
    try:
        update_combined_db()
        df = get_combined_df()
        print(f"✓ Combined DB initialized: {len(df)} rows")
        if len(df) > 0:
            print(f"  Columns: {len(df.columns)}")
            print(f"  Has _id: {'_id' in df.columns}")
            print(f"  Has _source: {'_source' in df.columns}")
    except Exception as e:
        print(f"✗ Error initializing: {str(e)}")
        traceback.print_exc()
    
    print("-" * 70)
    print("API Endpoints:")
    print("  GET  /api/health                    - Health check")
    print("  GET  /api/datasets                  - List datasets")
    print("  GET  /api/combined                  - Get combined data")
    print("  GET  /api/cache-stats               - Cache performance stats")
    print("  GET  /api/test-edit                 - Test edit functionality")
    print("  GET  /api/test-delete/<name>        - Test delete endpoint")
    print("  GET  /api/test                      - Simple test")
    print("  POST /api/upload                    - Upload file")
    print("  POST /api/update-row                - Update single row")
    print("  POST /api/delete-row                - Delete single row")
    print("  POST /api/combined                  - Save all data")
    print("  POST /api/search                    - Search data")
    print("  POST /api/search-column             - Search in column")
    print("  DELETE /api/dataset/<name>          - Delete dataset")
    print("  POST /api/datasets/delete-all       - Delete all datasets")
    print("  POST /api/rebuild-combined          - Rebuild combined DB")
    print("  GET  /api/export/combined           - Export combined DB")
    print("  GET  /api/export/dataset/<name>     - Export dataset")
    print("  GET  /api/debug/combined            - Debug info")
    print("-" * 70)
    print("Server starting on http://localhost:5000")
    print("=" * 70 + "\n")
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
    except OSError as e:
        if "Address already in use" in str(e):
            print("\nPort 5000 busy, trying 5001...")
            app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)
        else:
            raise
