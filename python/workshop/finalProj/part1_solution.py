import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

def run_part1_solution():
    print("--- เฉลยชุดคำถามที่ 1: การวิเคราะห์และ Visualization ---")
    
    # 1. นำเข้าไฟล์และทำความสะอาดเบื้องต้น
    print("ข้อ 1-2: นำเข้าและจัดการข้อมูล")
    df_orders = pd.read_csv('order_details.csv')
    df_customers = pd.read_csv('customer_profiles.csv')
    
    df_orders.columns = df_orders.columns.str.strip()
    df_customers.columns = df_customers.columns.str.strip()

    df_orders['Customer ID'] = df_orders['Customer ID'].str.strip().str.upper().str.replace('ID_', 'C')
    df_customers['CUSTOMER_ID'] = df_customers['CUSTOMER_ID'].str.strip().str.upper().str.replace('ID_', 'C')
    df_customers.drop_duplicates(subset=['CUSTOMER_ID'], inplace=True)

    df_orders['order_date'] = pd.to_datetime(df_orders['order_date'], errors='coerce')
    df_customers['registration_date'] = pd.to_datetime(df_customers['registration_date'], errors='coerce')
    
    merged_df = pd.merge(df_orders, df_customers, left_on='Customer ID', right_on='CUSTOMER_ID', how='left')

    merged_df['product_category'] = merged_df['product_category'].str.strip()
    merged_df['product_category'].replace('N/A', np.nan, inplace=True)
    merged_df['product_category'].fillna('Unknown', inplace=True)
    merged_df['total_price'].fillna(merged_df['total_price'].median(), inplace=True)
    merged_df.dropna(subset=['order_id'], inplace=True)
    print("✓ จัดการข้อมูลเรียบร้อยแล้ว")
    
    # 3. สรุปภาพรวม
    print("\nข้อ 3: สรุปภาพรวมของยอดขายและลูกค้า")
    total_sales = merged_df['total_price'].sum()
    total_customers = merged_df['Customer ID'].nunique()
    total_orders = merged_df['order_id'].nunique()
    print(f"ยอดขายรวมทั้งหมด: {total_sales:,.2f} บาท")
    print(f"จำนวนลูกค้าทั้งหมด: {total_customers} คน")
    print(f"จำนวนคำสั่งซื้อทั้งหมด: {total_orders} รายการ")

    # 4. ยอดขายรายเดือน (Bar Chart)
    print("\nข้อ 4: ยอดขายรายเดือน")
    df_monthly_sales = merged_df.set_index('order_date').resample('M')['total_price'].sum()
    df_monthly_sales.plot(kind='bar', title='ยอดขายรายเดือน (มิ.ย. - ส.ค.)')
    plt.ylabel('ยอดขาย (บาท)')
    plt.xticks(rotation=0)
    plt.show()

    # 5. แนวโน้มยอดขายรายวัน (Line Chart)
    print("\nข้อ 5: แนวโน้มยอดขายรายวัน")
    df_daily_sales = merged_df.set_index('order_date').resample('D')['total_price'].sum()
    df_daily_sales.plot(kind='line', title='แนวโน้มยอดขายรายวัน (มิ.ย. - ส.ค.)')
    plt.ylabel('ยอดขาย (บาท)')
    plt.show()

    # 6. สัดส่วนยอดขาย (Pie Chart)
    print("\nข้อ 6: สัดส่วนยอดขายของแต่ละประเภทสินค้า")
    df_sales_by_category = merged_df.groupby('product_category')['total_price'].sum()
    plt.figure(figsize=(8, 8))
    plt.pie(df_sales_by_category, labels=df_sales_by_category.index, autopct='%1.1f%%')
    plt.title('สัดส่วนยอดขายตามประเภทสินค้า')
    plt.show()

    # 7. พฤติกรรมการซื้อตามระดับสมาชิก (Grouped Bar Chart)
    print("\nข้อ 7: ยอดใช้จ่ายเฉลี่ยต่อคำสั่งซื้อตามระดับสมาชิก")
    avg_spend_by_level = merged_df.groupby('membership_level')['total_price'].mean().sort_values(ascending=False)
    avg_spend_by_level.plot(kind='bar', title='ยอดใช้จ่ายเฉลี่ยต่อคำสั่งซื้อตามระดับสมาชิก')
    plt.ylabel('ยอดใช้จ่ายเฉลี่ย (บาท)')
    plt.xticks(rotation=0)
    plt.show()

    # 8. การเปรียบเทียบเมือง (Hypothesis Testing)
    print("\nข้อ 8: ทดสอบสมมติฐานยอดขายเฉลี่ย Bangkok vs Chiang Mai")
    sales_bkk = merged_df[merged_df['city'] == 'Bangkok']['total_price']
    sales_cm = merged_df[merged_df['city'] == 'Chiang Mai']['total_price']
    t_stat, p_value = stats.ttest_ind(sales_bkk, sales_cm, nan_policy='omit')
    print(f"t-statistic: {t_stat:.4f}, p-value: {p_value:.4f}")
    if p_value < 0.05:
        print("✓ ยอดขายเฉลี่ยของทั้งสองเมืองแตกต่างกันอย่างมีนัยสำคัญทางสถิติ")
    else:
        print("✗ ยอดขายเฉลี่ยของทั้งสองเมืองไม่แตกต่างกันอย่างมีนัยสำคัญทางสถิติ")

    # 9. การกระจายตัวของราคา (Histogram)
    print("\nข้อ 9: การกระจายตัวของราคา")
    sns.histplot(merged_df['total_price'], bins=50)
    plt.title('การกระจายตัวของราคารวม (total_price)')
    plt.xlabel('ราคารวม')
    plt.show()
    # ตรวจสอบ Outliers โดยใช้ IQR
    Q1 = merged_df['total_price'].quantile(0.25)
    Q3 = merged_df['total_price'].quantile(0.75)
    IQR = Q3 - Q1
    outliers = merged_df[(merged_df['total_price'] < Q1 - 1.5 * IQR) | (merged_df['total_price'] > Q3 + 1.5 * IQR)]
    print(f"พบ Outliers ทั้งหมด {len(outliers)} รายการ")
    print(outliers[['Customer ID', 'total_price', 'product_category']].head())

    # 10. ยอดขายตามเมืองและประเภทสินค้า (Heatmap)
    print("\nข้อ 10: ยอดขายตามเมืองและประเภทสินค้า")
    df_heatmap = merged_df.groupby(['city', 'product_category'])['total_price'].sum().unstack()
    plt.figure(figsize=(10, 6))
    sns.heatmap(df_heatmap, cmap='YlGnBu', annot=True, fmt='.0f', linewidths=.5)
    plt.title('ยอดขายรวมตามเมืองและประเภทสินค้า')
    plt.show()
    
    # 11. ความสัมพันธ์ของข้อมูล (Scatter Plot)
    print("\nข้อ 11: ความสัมพันธ์ระหว่าง total_price และ quantity")
    sns.scatterplot(x='quantity', y='total_price', data=merged_df)
    plt.title('ความสัมพันธ์ระหว่างจำนวนสินค้าและราคารวม')
    plt.show()
    correlation = merged_df['quantity'].corr(merged_df['total_price'])
    print(f"ค่า Correlation: {correlation:.4f}")
    if correlation > 0.5:
        print("✓ มีความสัมพันธ์เชิงบวกที่ค่อนข้างสูง")
    else:
        print("✗ มีความสัมพันธ์เชิงบวกที่ค่อนข้างต่ำ")

    # 12-14. สร้างและวิเคราะห์ Features
    print("\nข้อ 12-14: การสร้างและวิเคราะห์ Features")
    # (โค้ดส่วนนี้จะคล้ายกับ prepare_ml_data.py)
    analysis_end = pd.to_datetime('2024-08-31')
    customer_lifetime_df = merged_df.drop_duplicates(subset=['Customer ID']).copy()
    customer_lifetime_df['customer_lifetime'] = (analysis_end - customer_lifetime_df['registration_date']).dt.days
    print(customer_lifetime_df[['Customer ID', 'customer_lifetime']].head())

    # 15. รายงานสรุปเชิงลึก
    print("\nข้อ 15: รายงานสรุปข้อมูลเชิงลึก")
    print("ข้อมูลเชิงลึก: ลูกค้า Gold มีแนวโน้มใช้จ่ายเฉลี่ยต่อคำสั่งซื้อสูงที่สุด")

    # 16. ข้อเสนอแนะทางธุรกิจ
    print("\nข้อ 16: ข้อเสนอแนะทางธุรกิจ 3 ข้อ")
    print("1. มุ่งเน้นแคมเปญสำหรับลูกค้า Gold: เนื่องจากยอดใช้จ่ายเฉลี่ยต่อคำสั่งซื้อสูงที่สุด (อ้างอิงจากข้อ 7)")
    print("2. จัดแคมเปญตามประเภทสินค้า: เช่น จัดโปรโมชั่น 'Electronics' ให้ลูกค้าในกรุงเทพฯ และจัด 'Clothing' ให้ลูกค้าในเชียงใหม่ (อ้างอิงจาก Heatmap ในข้อ 10)")
    print("3. พัฒนากลุ่มลูกค้าขาจร: ออกแบบ Loyalty Program เพื่อเพิ่มจำนวนการซื้อซ้ำในกลุ่มที่ซื้อเพียงครั้งเดียว")

if __name__ == '__main__':
    run_part1_solution()
