import streamlit as st
import duckdb
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

# 1. Page Configuration (Clean & Professional)
st.set_page_config(page_title="Walmart M5 Commercial Analytics", layout="wide")
st.title("Walmart M5 Commercial Dashboard")
st.markdown("Strategic Demand Planning, Sales Seasonality, and Price Elasticity Analytics")

# Plotly Configuration for High-Res Image Export
plotly_config = {
    'displayModeBar': True,
    'toImageButtonOptions': {
        'format': 'png',
        'filename': 'walmart_chart_export',
        'height': 600,
        'width': 1200,
        'scale': 2 # Export at 2x resolution
    }
}

# 2. Database Connection
@st.cache_resource
def get_connection():
    return duckdb.connect()

conn = get_connection()
parquet_file = "m5_dashboard_data.parquet"

# 3. Sidebar Filters
st.sidebar.header("Dashboard Filters")

# Fetch parameters
states = conn.execute(f"SELECT DISTINCT state_id FROM '{parquet_file}' WHERE state_id IS NOT NULL ORDER BY state_id").df()['state_id'].tolist()
categories = conn.execute(f"SELECT DISTINCT cat_id FROM '{parquet_file}' WHERE cat_id IS NOT NULL ORDER BY cat_id").df()['cat_id'].tolist()

selected_state = st.sidebar.selectbox("Select State", ["All States"] + states)
selected_cat = st.sidebar.multiselect("Select Categories", categories, default=categories)

# Time Aggregation Toggle
st.sidebar.markdown("---")
granularity = st.sidebar.radio("Time Series Granularity", ["Daily", "Weekly", "Monthly"])

# Build WHERE clause
where_clauses = []
if selected_state != "All States":
    where_clauses.append(f"state_id = '{selected_state}'")
if selected_cat:
    cats_str = "', '".join(selected_cat)
    where_clauses.append(f"cat_id IN ('{cats_str}')")

where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

# 4. Main Query
# Note: Assuming your parquet file has 'sell_price' or 'Average_Price'. Adjust the column name if necessary.
try:
    data_query = f"""
        SELECT 
            date, 
            cat_id, 
            SUM(sold) as Units_Sold,
            AVG(sell_price) as Avg_Price
        FROM '{parquet_file}'
        {where_sql}
        GROUP BY date, cat_id
        ORDER BY date
    """
    df_raw = conn.execute(data_query).df()
except duckdb.BinderException:
    # Fallback if the column is named differently in your parquet
    data_query = f"""
        SELECT 
            date, 
            cat_id, 
            SUM(sold) as Units_Sold,
            AVG(Average_Price) as Avg_Price
        FROM '{parquet_file}'
        {where_sql}
        GROUP BY date, cat_id
        ORDER BY date
    """
    df_raw = conn.execute(data_query).df()

# 5. Data Processing
if not df_raw.empty:
    df_raw['date'] = pd.to_datetime(df_raw['date'])
    df_raw['Month'] = df_raw['date'].dt.month
    df_raw['Day_of_Week'] = df_raw['date'].dt.day_name()
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    df_raw['Day_of_Week'] = pd.Categorical(df_raw['Day_of_Week'], categories=days_order, ordered=True)

    # Aggregation based on user selection
    if granularity == "Weekly":
        df_plot = df_raw.groupby(['cat_id', pd.Grouper(key='date', freq='W')])[['Units_Sold', 'Avg_Price']].mean().reset_index()
    elif granularity == "Monthly":
        df_plot = df_raw.groupby(['cat_id', pd.Grouper(key='date', freq='ME')])[['Units_Sold', 'Avg_Price']].mean().reset_index()
    else:
        df_plot = df_raw.copy()

# 6. KPI Metrics Section
st.subheader("Key Performance Indicators")
col1, col2, col3, col4 = st.columns(4)

if not df_raw.empty:
    total_sales = df_raw['Units_Sold'].sum()
    daily_totals = df_raw.groupby('date')['Units_Sold'].sum()
    peak_sales = daily_totals.max()
    peak_date = daily_totals.idxmax().strftime('%Y-%m-%d')
    avg_price = df_raw['Avg_Price'].mean()
    
    col1.metric("Total Volume (Units)", f"{total_sales:,.0f}")
    col2.metric("Peak Daily Volume", f"{peak_sales:,.0f}")
    col3.metric("Peak Volume Date", peak_date)
    col4.metric("Avg Unit Price ($)", f"${avg_price:.2f}")
else:
    st.warning("No data available for the selected filters.")

st.markdown("---")

# 7. Advanced Visualizations
if not df_raw.empty:
    tab1, tab2, tab3, tab4 = st.tabs(["Sales Trend & Volatility", "Seasonality Heatmap", "Price Analytics", "Category Breakdown"])

    # Tab 1: Time Series with Trendline option
    with tab1:
        fig_line = px.line(df_plot, x='date', y='Units_Sold', color='cat_id',
                           title=f"Sales Volume ({granularity} Aggregation)",
                           template="plotly_white",
                           labels={'Units_Sold': 'Units Sold', 'date': 'Time', 'cat_id': 'Category'})
        
        # Make the lines look crisp
        fig_line.update_traces(mode="lines", line_shape="spline" if granularity == "Monthly" else "linear")
        fig_line.update_layout(hovermode="x unified")
        st.plotly_chart(fig_line, use_container_width=True, config=plotly_config)

    # Tab 2: Heatmap (Month vs Day of Week)
    with tab2:
        heatmap_data = df_raw.groupby(['Day_of_Week', 'Month'], observed=True)['Units_Sold'].mean().reset_index()
        heatmap_pivot = heatmap_data.pivot(index='Day_of_Week', columns='Month', values='Units_Sold')
        
        fig_heat = px.imshow(heatmap_pivot, 
                             labels=dict(x="Month (1-12)", y="Day of Week", color="Avg Sales"),
                             x=heatmap_pivot.columns,
                             y=heatmap_pivot.index,
                             title="Interplay of Monthly and Weekly Seasonality",
                             color_continuous_scale="Blues",
                             aspect="auto",
                             template="plotly_white")
        st.plotly_chart(fig_heat, use_container_width=True, config=plotly_config)

    # Tab 3: Price Distribution & Elasticity
    with tab3:
        col_price1, col_price2 = st.columns(2)
        
        with col_price1:
            fig_hist = px.histogram(df_raw, x="Avg_Price", color="cat_id", 
                                    nbins=50, 
                                    title="Price Distribution by Category",
                                    template="plotly_white",
                                    labels={'Avg_Price': 'Average Price ($)'},
                                    opacity=0.7, barmode="overlay")
            st.plotly_chart(fig_hist, use_container_width=True, config=plotly_config)
            
        with col_price2:
            fig_scatter = px.scatter(df_raw, x="Avg_Price", y="Units_Sold", color="cat_id",
                                     title="Price vs. Volume (Price Elasticity Proxy)",
                                     template="plotly_white",
                                     opacity=0.5,
                                     trendline="ols",
                                     labels={'Avg_Price': 'Average Price ($)', 'Units_Sold': 'Daily Units Sold'})
            st.plotly_chart(fig_scatter, use_container_width=True, config=plotly_config)

    # Tab 4: Standard Breakdown
    with tab4:
        cat_summary = df_raw.groupby('cat_id')['Units_Sold'].sum().reset_index()
        fig_bar = px.bar(cat_summary, x='cat_id', y='Units_Sold', color='cat_id',
                         title="Cumulative Sales Volume by Category",
                         template="plotly_white",
                         text_auto='.2s')
        st.plotly_chart(fig_bar, use_container_width=True, config=plotly_config)