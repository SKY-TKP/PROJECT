import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

def run_part1_solution():
    print("--- Solution Part 1: Data Analysis and Visualization ---")
    
    # Set seaborn style and context for high-quality graphs
    sns.set_theme(style="whitegrid", context="talk", palette="viridis")
    
    # 1. Import and initial data cleaning
    print("Q1-2: Import and Data Management")
    try:
        df_orders = pd.read_csv('order_details.csv')
        df_customers = pd.read_csv('customer_profiles.csv')
    except FileNotFoundError:
        print("Data files not found. Please ensure 'create_project_data.py' has been run.")
        return

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
    print("✓ Data cleaning completed.")
    
    # 3. Overall Summary
    print("\nQ3: Overall Sales and Customer Summary")
    total_sales = merged_df['total_price'].sum()
    total_customers = merged_df['Customer ID'].nunique()
    total_orders = merged_df['order_id'].nunique()
    print(f"Total Sales: {total_sales:,.2f} THB")
    print(f"Total Customers: {total_customers} people")
    print(f"Total Orders: {total_orders} items")

    # 4. Monthly Sales (Horizontal Bar Chart)
    print("\nQ4: Monthly Sales")
    plt.figure(figsize=(10, 6), facecolor='none')
    df_monthly_sales = merged_df.set_index('order_date').resample('M')['total_price'].sum().sort_values()
    ax = sns.barplot(x=df_monthly_sales.values, y=df_monthly_sales.index.strftime('%b'), orient='h', palette='viridis')
    plt.title('Monthly Sales (Jun - Aug)', fontsize=20, pad=20)
    plt.xlabel('Sales (THB)', fontsize=14)
    plt.ylabel('Month', fontsize=14)
    for p in ax.patches:
        ax.annotate(f'{p.get_width():,.0f}', (p.get_width(), p.get_y() + p.get_height() / 2.),
                    ha='left', va='center', xytext=(10, 0), textcoords='offset points', fontsize=12)
    plt.tight_layout()
    plt.show()

    # 5. Daily Sales Trend (Line Chart)
    print("\nQ5: Daily Sales Trend")
    plt.figure(figsize=(12, 7), facecolor='none')
    df_daily_sales = merged_df.set_index('order_date').resample('D')['total_price'].sum().fillna(0)
    sns.lineplot(data=df_daily_sales, color='royalblue', linewidth=2.5)
    plt.title('Daily Sales Trend (Jun - Aug)', fontsize=20, pad=20)
    plt.ylabel('Sales (THB)', fontsize=14)
    plt.xlabel('Date', fontsize=14)
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    plt.tight_layout()
    plt.show()

    # 6. Sales Proportion (Pie Chart)
    print("\nQ6: Sales Proportion by Product Category")
    plt.figure(figsize=(10, 10), facecolor='none')
    df_sales_by_category = merged_df.groupby('product_category')['total_price'].sum().sort_values(ascending=False)
    plt.pie(df_sales_by_category, labels=df_sales_by_category.index, autopct='%1.1f%%',
            colors=sns.color_palette("Set2", len(df_sales_by_category)), startangle=90,
            wedgeprops={"edgecolor": "black", 'linewidth': 1, 'antialiased': True})
    plt.title('Sales Proportion by Product Category', fontsize=20, pad=20)
    plt.tight_layout()
    plt.show()

    # 7. Average Spend per Order by Membership Level (Horizontal Bar Chart)
    print("\nQ7: Average Spend per Order by Membership Level")
    plt.figure(figsize=(10, 6), facecolor='none')
    avg_spend_by_level = merged_df.groupby('membership_level')['total_price'].mean().sort_values()
    ax = sns.barplot(x=avg_spend_by_level.values, y=avg_spend_by_level.index, orient='h', palette='pastel')
    plt.title('Average Spend per Order by Membership Level', fontsize=20, pad=20)
    plt.xlabel('Average Spend (THB)', fontsize=14)
    plt.ylabel('Membership Level', fontsize=14)
    for p in ax.patches:
        ax.annotate(f'{p.get_width():,.0f}', (p.get_width(), p.get_y() + p.get_height() / 2.),
                    ha='left', va='center', xytext=(10, 0), textcoords='offset points', fontsize=12)
    plt.tight_layout()
    plt.show()

    # 8. City Comparison (Hypothesis Testing)
    print("\nQ8: Hypothesis Test on Average Sales: Bangkok vs. Chiang Mai")
    sales_bkk = merged_df[merged_df['city'] == 'Bangkok']['total_price']
    sales_cm = merged_df[merged_df['city'] == 'Chiang Mai']['total_price']
    t_stat, p_value = stats.ttest_ind(sales_bkk, sales_cm, nan_policy='omit')
    print(f"t-statistic: {t_stat:.4f}, p-value: {p_value:.4f}")
    if p_value < 0.05:
        print("✓ The average sales of the two cities are statistically significant.")
    else:
        print("✗ The average sales of the two cities are not statistically significant.")

    # 9. Price Distribution (Histogram)
    print("\nQ9: Price Distribution")
    plt.figure(figsize=(12, 7), facecolor='none')
    sns.histplot(merged_df['total_price'], bins=50, kde=True, color='purple', edgecolor='black')
    plt.title('Distribution of Total Price', fontsize=20, pad=20)
    plt.xlabel('Total Price (THB)', fontsize=14)
    plt.ylabel('Count', fontsize=14)
    plt.tight_layout()
    plt.show()
    # Check for Outliers using IQR
    Q1 = merged_df['total_price'].quantile(0.25)
    Q3 = merged_df['total_price'].quantile(0.75)
    IQR = Q3 - Q1
    outliers = merged_df[(merged_df['total_price'] < Q1 - 1.5 * IQR) | (merged_df['total_price'] > Q3 + 1.5 * IQR)]
    print(f"Found a total of {len(outliers)} outliers.")
    print(outliers[['Customer ID', 'total_price', 'product_category']].head())

    # 10. Sales by City and Product Category (Heatmap)
    print("\nQ10: Sales by City and Product Category")
    plt.figure(figsize=(14, 10), facecolor='none')
    df_heatmap = merged_df.groupby(['city', 'product_category'])['total_price'].sum().unstack()
    sns.heatmap(df_heatmap, cmap='YlGnBu', annot=True, fmt=',.0f', linewidths=.5, cbar_kws={'label': 'Total Sales (THB)'},
                annot_kws={"size": 12})
    plt.title('Total Sales by City and Product Category', fontsize=20, pad=20)
    plt.xlabel('Product Category', fontsize=14)
    plt.ylabel('City', fontsize=14)
    plt.tight_layout()
    plt.show()
    
    # 11. Data Correlation (Scatter Plot)
    print("\nQ11: Correlation between total_price and quantity")
    plt.figure(figsize=(10, 6), facecolor='none')
    sns.scatterplot(x='quantity', y='total_price', data=merged_df, alpha=0.6, color='darkgreen')
    plt.title('Relationship between Quantity and Total Price', fontsize=20, pad=20)
    plt.xlabel('Quantity', fontsize=14)
    plt.ylabel('Total Price (THB)', fontsize=14)
    plt.tight_layout()
    plt.show()
    correlation = merged_df['quantity'].corr(merged_df['total_price'])
    print(f"Correlation value: {correlation:.4f}")
    if correlation > 0.5:
        print("✓ There is a relatively high positive correlation.")
    else:
        print("✗ There is a relatively low positive correlation.")

    # 12-14. Feature Creation and Analysis
    print("\nQ12-14: Creating and Analyzing Features")
    analysis_end = pd.to_datetime('2024-08-31')
    customer_lifetime_df = merged_df.drop_duplicates(subset=['Customer ID']).copy()
    customer_lifetime_df['customer_lifetime'] = (analysis_end - customer_lifetime_df['registration_date']).dt.days
    print(customer_lifetime_df[['Customer ID', 'customer_lifetime']].head())

    # 15. In-depth Summary Report
    print("\nQ15: In-depth Data Summary Report")
    print("Insight: Gold members tend to have the highest average spending per order.")

    # 16. Business Recommendations
    print("\nQ16: 3 Business Recommendations")
    print("1. Focus campaigns on Gold members: Their average spend per order is the highest (referencing Q7).")
    print("2. Run product-specific campaigns: For example, promote 'Electronics' for Bangkok customers and 'Clothing' for Chiang Mai customers (referencing the Heatmap in Q10).")
    print("3. Develop 'Sporadic Buyers' with a loyalty program to increase repeat purchases for one-time buyers.")

if __name__ == '__main__':
    run_part1_solution()
