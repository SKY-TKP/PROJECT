# ==================================================================
# ส่วนที่ 1: โค้ดสำหรับสร้างข้อมูลดิบที่ยุ่งเหยิง (Messy Data)
# ==================================================================
print("--- เริ่มต้นสร้างข้อมูลดิบที่ยุ่งเหยิง ---")
import pandas as pd
import numpy as np
import random

def create_messy_data():
    num_records_main = 8000
    num_customers = 750
    num_repeat_customers = int(num_customers * 0.15)
    start_date = '2024-06-01'
    end_date = '2024-09-30'

    customer_ids_normal = [f'C{i:04d}' for i in range(1, num_customers // 2 + 1)]
    customer_ids_complex = [f'ID_{i:03d}' for i in range(1, num_customers // 2 + 1)]
    customer_ids_mixed = customer_ids_normal + customer_ids_complex

    repeat_customers_list = np.random.choice(customer_ids_mixed, size=num_repeat_customers, replace=False)

    order_data = {
        'order_id': range(10001, 10001 + num_records_main),
        'order_date': [d.strftime('%Y-%m-%d') if random.random() < 0.8 else d.strftime('%d/%m/%Y')
                       for d in pd.to_datetime(np.random.choice(pd.date_range(start_date, end_date), num_records_main))],
        'customer_ID': np.random.choice(customer_ids_mixed, num_records_main),
        'product_category': np.random.choice(['Electronics ', 'Clothing', 'Home', 'BOOKS', 'Beauty'], num_records_main),
        'product_price': np.random.randint(100, 10000, num_records_main),
        'quantity': np.random.randint(1, 5, num_records_main),
    }
    df_orders = pd.DataFrame(order_data)

    next_month_records = num_repeat_customers * 2
    next_month_orders_data = {
        'order_id': range(10001 + num_records_main, 10001 + num_records_main + next_month_records),
        'order_date': pd.to_datetime(np.random.choice(pd.date_range('2024-09-01', '2024-09-15'), next_month_records)),
        'customer_ID': np.random.choice(repeat_customers_list, next_month_records),
        'product_category': np.random.choice(['Electronics ', 'Clothing', 'Home', 'BOOKS', 'Beauty'], next_month_records),
        'product_price': np.random.randint(100, 10000, next_month_records),
        'quantity': np.random.randint(1, 5, next_month_records),
    }
    df_next_month = pd.DataFrame(next_month_orders_data)

    df_orders_combined = pd.concat([df_orders, df_next_month], ignore_index=True)
    df_orders_combined['total_price'] = df_orders_combined['product_price'] * df_orders_combined['quantity']
    df_orders_combined = df_orders_combined.rename(columns={'customer_ID': ' Customer ID '})
    df_orders_combined.loc[df_orders_combined['order_id'].sample(int(num_records_main * 0.05)).index, 'product_price'] = np.nan
    df_orders_combined.loc[df_orders_combined['order_id'].sample(int(num_records_main * 0.05)).index, 'product_category'] = 'N/A'
    df_orders_combined.to_csv('order_details.csv', index=False)
    print("✓ สร้าง 'order_details_messy.csv' เสร็จสมบูรณ์")

    customer_profile_data = {
        'Customer_ID': customer_ids_mixed,
        'city': np.random.choice(['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Khon Kaen'], num_customers),
        'membership_level': np.random.choice(['Bronze', 'Silver', 'Gold'], num_customers),
        'registration_date': [d.strftime('%Y-%m-%d') if random.random() < 0.9 else 'unknown'
                               for d in pd.to_datetime(np.random.choice(pd.date_range('2023-01-01', '2024-05-31'), num_customers))]
    }
    df_customers = pd.DataFrame(customer_profile_data)
    df_customers = pd.concat([df_customers, df_customers.sample(5)], ignore_index=True)
    df_customers = df_customers.rename(columns={'Customer_ID': ' CUSTOMER_ID '})
    df_customers.to_csv('customer_profiles.csv', index=False)
    print("✓ สร้าง 'customer_profiles_messy.csv' เสร็จสมบูรณ์")

create_messy_data()


# ==================================================================
# ส่วนที่ 2: โค้ดสำหรับเตรียมข้อมูลสำหรับ Machine Learning
# ==================================================================
print("\n--- เริ่มต้นเตรียมข้อมูลสำหรับ Machine Learning ---")
def prepare_ml_data():
    df_orders = pd.read_csv('order_details_messy.csv')
    df_customers = pd.read_csv('customer_profiles_messy.csv')

    df_orders.columns = df_orders.columns.str.strip()
    df_customers.columns = df_customers.columns.str.strip()

    df_orders['Customer ID'] = df_orders['Customer ID'].str.strip().str.upper().str.replace('ID_', 'C')
    df_customers['CUSTOMER_ID'] = df_customers['CUSTOMER_ID'].str.strip().str.upper().str.replace('ID_', 'C')
    df_customers.drop_duplicates(subset=['CUSTOMER_ID'], inplace=True)

    df_orders['order_date'] = pd.to_datetime(df_orders['order_date'], errors='coerce')
    df_customers['registration_date'] = pd.to_datetime(df_customers['registration_date'], errors='coerce')

    merged_df = pd.merge(df_orders, df_customers, left_on='Customer ID', right_on='CUSTOMER_ID', how='left')

    analysis_start = pd.to_datetime('2024-06-01')
    analysis_end = pd.to_datetime('2024-08-31')
    target_start = pd.to_datetime('2024-09-01')
    target_end = pd.to_datetime('2024-09-30')

    df_analysis = merged_df[(merged_df['order_date'] >= analysis_start) & (merged_df['order_date'] <= analysis_end)].copy()
    df_analysis['total_price'].fillna(df_analysis['total_price'].mean(), inplace=True)

    df_ml = pd.DataFrame(df_customers['CUSTOMER_ID'].unique(), columns=['customer_id'])

    purchase_summary = df_analysis.groupby('Customer ID').agg(
        total_spend_last_3_months=('total_price', 'sum'),
        purchase_count_last_3_months=('order_id', 'count')
    ).reset_index()
    df_ml = pd.merge(df_ml, purchase_summary, left_on='customer_id', right_on='Customer ID', how='left').drop(columns='Customer ID')

    df_ml['avg_spend_per_purchase'] = df_ml['total_spend_last_3_months'] / df_ml['purchase_count_last_3_months']

    df_customer_features = df_customers.drop_duplicates(subset=['CUSTOMER_ID']).copy()
    df_customer_features['customer_lifetime'] = (analysis_end - df_customer_features['registration_date']).dt.days
    df_ml = pd.merge(df_ml, df_customer_features[['CUSTOMER_ID', 'customer_lifetime', 'membership_level']],
                    left_on='customer_id', right_on='CUSTOMER_ID', how='left').drop(columns='CUSTOMER_ID')

    def get_most_purchased_category(customer_id):
        customer_orders = df_analysis[df_analysis['Customer ID'] == customer_id]
        # Check if customer_orders is empty
        if not customer_orders.empty:
            # Handle cases where mode might return an empty Series
            modes = customer_orders['product_category'].mode()
            if not modes.empty:
                return modes[0].strip()
        return 'Unknown'
    df_ml['most_purchased_category'] = df_ml['customer_id'].apply(get_most_purchased_category)

    df_next_month_orders = merged_df[(merged_df['order_date'] >= target_start) & (merged_df['order_date'] <= target_end)]
    repeat_buyers = df_next_month_orders['Customer ID'].unique()
    df_ml['repeat_purchase'] = df_ml['customer_id'].isin(repeat_buyers).astype(int)

    df_ml.fillna({'total_spend_last_3_months': 0, 'purchase_count_last_3_months': 0, 'avg_spend_per_purchase': 0,
                  'customer_lifetime': df_ml['customer_lifetime'].median(),
                  'membership_level': 'Unknown'}, inplace=True)
    df_ml['membership_level'] = df_ml['membership_level'].str.strip().str.capitalize()
    df_ml['most_purchased_category'] = df_ml['most_purchased_category'].str.strip().str.capitalize()
    df_ml.to_csv('ml_ready_features.csv', index=False)
    print("✓ สร้าง 'ml_ready_features.csv' เสร็จสมบูรณ์")

prepare_ml_data()
