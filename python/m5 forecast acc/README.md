# Walmart M5 Forecasting Challenge: Analytics & Visualization

![End-to-End Analytics and Modeling Pipeline](https://github.com/SKY-TKP/PROJECT/blob/main/python/m5%20forecast%20acc/figures/00_ProjectPipeline.png)

This repository is the central hub for the **Walmart M5 Forecasting Challenge** project. It documents the end-to-end data science pipeline—from raw data ingestion to interactive commercial dashboards—focused on solving hierarchical demand forecasting under normal and pandemic scenarios.

---

## 📂 Documentation Library

The following reports provide a comprehensive view of the analytical framework:

| Report File | Focus Area | Key Analytical Objectives |
| :--- | :--- | :--- |
| **Part 1** | Baseline Analysis | Macro-trends, categorical mix, seasonality, and model validation. |
| **Part 2** | Crisis Resilience | Structural shocks, COVID-19 pandemic impacts, and forecasting pivots. |
| **Part 3** | Technical Guide | Dashboard architecture, DuckDB integration, and deployment guide. |

---

## 🛠 Tools Analysis: Why DuckDB + Streamlit?

To balance memory constraints with sub-second analytical performance, we evaluated various BI toolsets for visualizing the 60+ million records:

| Criteria | Power BI / Tableau | BigQuery + Looker | **DuckDB + Streamlit** |
| :--- | :--- | :--- | :--- |
| **Deployment** | Desktop/SaaS | Cloud-Native | **Local/Serverless** |
| **Latency** | Moderate | Network Dependent | **Sub-second** |
| **Cost** | License Fees | Query-based Billing | **Free (Open Source)** |

> *The **DuckDB + Streamlit** stack was selected for its ability to treat local disk-based `.parquet` files as a high-performance OLAP database, bypassing memory overhead.*

---

## 📊 Dashboard Deployment

The dashboard uses a serverless architecture where Python queries compressed files directly.

### 1. Generating Dashboard Data (In Jupyter)
To generate the necessary data for the dashboard, run this command within your existing **Jupyter Notebook** pipeline after processing your data:

```python
# Save processed DataFrame as a highly compressed Parquet file
df.to_parquet('m5_dashboard_project/m5_dashboard_data.parquet', index=False)

```

### 2. Launching the Interactive Dashboard

The dashboard uses DuckDB to query the data without loading the entire 60 million-row dataset into RAM.
![Interact](https://github.com/SKY-TKP/PROJECT/blob/main/python/m5%20forecast%20acc/figures/10_InteractiveDashboard.png)

**Install Requirements:**

```bash
pip install streamlit duckdb plotly pandas

```

**Navigate to the Project Folder:**

```bash
cd m5_dashboard_project

```

**Run the Dashboard:**

```bash
streamlit run app.py

```

---

## 📈 Analytical Architecture

The visual design of the pipeline ensures data consistency across the predictive and dashboard phases:

* **Data Preparation:** Standardizes the wide-format M5 data into a long-format, memory-efficient structure.
* **Predictive Modeling:** Employs LightGBM with GOSS and EFB for rapid convergence on sparse data.
* **Visualization Layer:** Utilizes Plotly with `render_mode="svg"` for high-resolution spline-smoothed trend lines.

---

## 🖼 Key Insights & Asset Library

Below are key exploratory visuals, model validation metrics, and analytical snapshots generated throughout the project.

### Sales Trends & Geographic Breakdown
![Long](https://github.com/SKY-TKP/PROJECT/blob/main/python/m5%20forecast%20acc/figures/01_LongTerm_Sales_Trend.png)

### Seasonality Analytics
![Seasonality](https://github.com/SKY-TKP/PROJECT/blob/main/python/m5%20forecast%20acc/figures/07_Seasonality_Heatmap.png)

### Price, Events, & External Impacts
![Event](https://github.com/SKY-TKP/PROJECT/blob/main/python/m5%20forecast%20acc/figures/06_Event_Sales_Lift.png)


```

```
