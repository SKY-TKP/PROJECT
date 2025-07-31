import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def run_part2_solution():
    print("--- Solution Part 2: Building a Machine Learning Model ---")
    
    # --- 1. Data Preparation for Logistic Regression Model ---
    print("\n1.1 Preparing Data for Logistic Regression")
    
    try:
        df_ml = pd.read_csv('ml_ready_features.csv')
    except FileNotFoundError:
        print("File 'ml_ready_features.csv' not found. Please ensure the data creation script has been run.")
        return

    # Create a new, more balanced Target Variable
    # Predict whether a customer is a 'high spender' based on their total spend
    median_spend = df_ml['total_spend_last_3_months'].median()
    df_ml['is_high_spender'] = (df_ml['total_spend_last_3_months'] > median_spend).astype(int)
    
    # Define features and target clearly
    features = [
        'total_spend_last_3_months', 'purchase_count_last_3_months', 
        'avg_spend_per_purchase', 'customer_lifetime', 'membership_level'
    ]
    
    X = df_ml[features]
    y = df_ml['is_high_spender']
    
    # Handle Categorical and Numeric data
    categorical_features = ['membership_level']
    numeric_features = [col for col in X.columns if col not in categorical_features]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='passthrough'
    )
    
    # Split the dataset into Training and Testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print("✓ Target variable created, data prepared, and split into Training/Testing sets.")

    # --- 2. Build and Visualize the Logistic Regression Model ---
    print("\n2.1 Building the Logistic Regression Model")
    model_lr = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(solver='liblinear', random_state=42))
    ])
    model_lr.fit(X_train, y_train)

    print("\n2.2 Visualization of Sigmoid Function and Decision Boundary")
    feature_name = 'total_spend_last_3_months'
    
    X_for_curve = pd.DataFrame({
        feature_name: np.linspace(X[feature_name].min(), X[feature_name].max(), 300),
        'purchase_count_last_3_months': [X['purchase_count_last_3_months'].mean()] * 300,
        'customer_lifetime': [X['customer_lifetime'].mean()] * 300,
        'avg_spend_per_purchase': [X['avg_spend_per_purchase'].mean()] * 300,
        'membership_level': ['Bronze'] * 300
    })
    
    y_prob_curve = model_lr.predict_proba(X_for_curve)[:, 1]
    
    plt.figure(figsize=(10, 6))
    sns.scatterplot(x=X[feature_name], y=y, alpha=0.6, hue=y, palette='viridis')
    plt.plot(X_for_curve[feature_name], y_prob_curve, color='red', label='Sigmoid Curve')
    
    try:
        decision_boundary_value = X_for_curve[y_prob_curve >= 0.5][feature_name].iloc[0]
        plt.axvline(x=decision_boundary_value, color='green', linestyle='--', label=f'Decision Boundary ({decision_boundary_value:.2f})')
    except IndexError:
        print("Decision Boundary could not be found.")
    
    plt.title(f'Sigmoid Curve & Decision Boundary for {feature_name}')
    plt.xlabel(feature_name)
    plt.ylabel('Probability of High Spender')
    plt.legend()
    plt.show()
    print("✓ Sigmoid Function and Decision Boundary graph created.")
    
    # --- 3. Evaluate and Interpret the Logistic Regression Model ---
    print("\n3.1 Evaluating Logistic Regression Performance")
    y_pred = model_lr.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall: {recall_score(y_test, y_pred):.4f}")
    print(f"F1-Score: {f1_score(y_test, y_pred):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("Interpretation: For this problem, Precision (the accuracy of predicting high spenders) is the most important metric.")

    # --- 4. Build and Visualize the K-Means Clustering Model ---
    print("\n4.1 Preparing Data for K-Means")
    features_for_clustering = ['total_spend_last_3_months', 'purchase_count_last_3_months', 'avg_spend_per_purchase', 'customer_lifetime']
    X_cluster = df_ml[features_for_clustering].copy()
    
    scaler_cluster = StandardScaler()
    X_scaled = scaler_cluster.fit_transform(X_cluster)
    print("✓ Data standardized.")
    
    print("\n4.2 Elbow Method to find the optimal number of clusters")
    sse = []
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        sse.append(kmeans.inertia_)
    
    plt.figure(figsize=(8, 5))
    plt.plot(range(1, 11), sse, marker='o')
    plt.title('Elbow Method')
    plt.xlabel('Number of Clusters (K)')
    plt.ylabel('Sum of Squared Errors (SSE)')
    plt.show()
    print("✓ Elbow Method graph displayed to assist in selecting K.")

    k_optimal = 3
    kmeans = KMeans(n_clusters=k_optimal, random_state=42, n_init=10)
    df_ml['Cluster'] = kmeans.fit_predict(X_scaled)
    
    print("\n4.3 Visualization of K-Means Clustering")
    plt.figure(figsize=(10, 6))
    sns.scatterplot(x='total_spend_last_3_months', y='purchase_count_last_3_months', hue='Cluster', data=df_ml, palette='viridis')
    plt.title('K-Means Clustering Output')
    plt.xlabel('Total Spend Last 3 Months')
    plt.ylabel('Purchase Count Last 3 Months')
    plt.legend(title='Customer Cluster')
    plt.show()

    # --- 5. Business Summary and Recommendations ---
    print("\n5.1 Summary of Clustering Results")
    cluster_analysis = df_ml.groupby('Cluster').agg(
        total_spend_mean=('total_spend_last_3_months', 'mean'),
        purchase_count_mean=('purchase_count_last_3_months', 'mean'),
        membership_mode=('membership_level', lambda x: x.mode()[0])
    )
    print(cluster_analysis)
    
    print("\n5.2 Business Recommendations")
    print("Based on the results from Clustering and the Logistic Regression model:")
    print("1. Cluster 0 ('Sporadic Buyers') have low spend and low purchase count. Use campaigns to encourage repeat purchases.")
    print("2. Cluster 1 ('Heavy Spenders') have high spend and are mostly Gold members. Offer exclusive privileges and premium products.")
    print("3. Use the Logistic Regression model to identify customers from all clusters who have a high probability of being high spenders and target them with personalized campaigns.")

if __name__ == '__main__':
    run_part2_solution()
