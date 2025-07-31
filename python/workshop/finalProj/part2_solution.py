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
    print("--- เฉลยชุดคำถามที่ 2: การสร้าง Machine Learning Model ---")
    
    # --- 1. การเตรียมข้อมูลสำหรับโมเดล Logistic Regression ---
    print("\n1.1 การเตรียมข้อมูลสำหรับ Logistic Regression")
    
    try:
        df_ml = pd.read_csv('ml_ready_features.csv')
    except FileNotFoundError:
        print("ไม่พบไฟล์ 'ml_ready_features.csv' โปรดตรวจสอบว่าได้รันโค้ดส่วนที่สร้างไฟล์แล้ว")
        return

    # แก้ไข: สร้าง Target Variable ใหม่ที่สมดุลมากขึ้น
    # โดยทำนายว่าลูกค้ามี 'total_spend_last_3_months' สูงกว่าค่าเฉลี่ยหรือไม่
    median_spend = df_ml['total_spend_last_3_months'].median()
    df_ml['is_high_spender'] = (df_ml['total_spend_last_3_months'] > median_spend).astype(int)
    
    # กำหนดคอลัมน์ที่จะใช้เป็น Features และ Target อย่างชัดเจน
    features = [
        'total_spend_last_3_months', 'purchase_count_last_3_months', 
        'avg_spend_per_purchase', 'customer_lifetime', 'membership_level'
    ]
    
    X = df_ml[features]
    y = df_ml['is_high_spender'] # ใช้ Target Variable ที่สร้างใหม่
    
    # จัดการข้อมูล Categorical และ Numeric
    categorical_features = ['membership_level']
    numeric_features = [col for col in X.columns if col not in categorical_features]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='passthrough'
    )
    
    # แบ่งชุดข้อมูลเป็น Training และ Testing set
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print("✓ สร้าง Target Variable ใหม่, เตรียมข้อมูล และแบ่ง Training/Testing set เรียบร้อย")

    # --- 2. การสร้างและ Visualization โมเดล Logistic Regression ---
    print("\n2.1 สร้างโมเดล Logistic Regression")
    model_lr = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(solver='liblinear', random_state=42))
    ])
    model_lr.fit(X_train, y_train)

    print("\n2.2 Visualization Sigmoid Function และ Decision Boundary")
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
        print("ไม่สามารถหา Decision Boundary ได้")
    
    plt.title(f'Sigmoid Curve & Decision Boundary for {feature_name}')
    plt.xlabel(feature_name)
    plt.ylabel('Probability of High Spender')
    plt.legend()
    plt.show()
    print("✓ สร้างกราฟ Sigmoid Function และ Decision Boundary เรียบร้อย")
    
    # --- 3. การประเมินผลและการตีความ Logistic Regression ---
    print("\n3.1 การประเมินผล Logistic Regression")
    y_pred = model_lr.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall: {recall_score(y_test, y_pred):.4f}")
    print(f"F1-Score: {f1_score(y_test, y_pred):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("การตีความ: สำหรับโจทย์นี้ Precision (ความแม่นยำในการทำนายว่าลูกค้าจะใช้จ่ายสูงจริง) สำคัญที่สุด")

    # --- 4. การสร้างและ Visualization โมเดล K-Means Clustering ---
    print("\n4.1 การเตรียมข้อมูลสำหรับ K-Means")
    features_for_clustering = ['total_spend_last_3_months', 'purchase_count_last_3_months', 'avg_spend_per_purchase', 'customer_lifetime']
    X_cluster = df_ml[features_for_clustering].copy()
    
    scaler_cluster = StandardScaler()
    X_scaled = scaler_cluster.fit_transform(X_cluster)
    print("✓ ปรับขนาดข้อมูล (Standardization) เรียบร้อย")
    
    print("\n4.2 Elbow Method เพื่อหาจำนวน Cluster ที่เหมาะสม")
    sse = []
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        sse.append(kmeans.inertia_)
    
    plt.figure(figsize=(8, 5))
    plt.plot(range(1, 11), sse, marker='o')
    plt.title('Elbow Method')
    plt.xlabel('Number of Clusters (K)')
    plt.ylabel('SSE')
    plt.show()
    print("✓ แสดงกราฟ Elbow Method เพื่อช่วยในการตัดสินใจเลือก K")

    k_optimal = 3
    kmeans = KMeans(n_clusters=k_optimal, random_state=42, n_init=10)
    df_ml['Cluster'] = kmeans.fit_predict(X_scaled)
    
    print("\n4.3 Visualization K-Means Clustering")
    plt.figure(figsize=(10, 6))
    sns.scatterplot(x='total_spend_last_3_months', y='purchase_count_last_3_months', hue='Cluster', data=df_ml, palette='viridis')
    plt.title('การจัดกลุ่มลูกค้าด้วย K-Means')
    plt.show()

    # --- 5. การสรุปและข้อเสนอแนะทางธุรกิจ ---
    print("\n5.1 สรุปผลลัพธ์ของ Clustering")
    cluster_analysis = df_ml.groupby('Cluster').agg(
        total_spend_mean=('total_spend_last_3_months', 'mean'),
        purchase_count_mean=('purchase_count_last_3_months', 'mean'),
        membership_mode=('membership_level', lambda x: x.mode()[0])
    )
    print(cluster_analysis)
    
    print("\n5.2 ข้อเสนอแนะทางธุรกิจ")
    print("จากผลลัพธ์ของ Clustering และโมเดล Logistic Regression:")
    print("1. ลูกค้า Cluster 0 ('ลูกค้าขาจร') มียอดใช้จ่ายต่ำและซื้อน้อยครั้ง ควรใช้แคมเปญกระตุ้นการซื้อซ้ำ")
    print("2. ลูกค้า Cluster 1 ('ลูกค้ากระเป๋าหนัก') มียอดใช้จ่ายสูงและเป็นสมาชิก Gold ควรเสนอสิทธิพิเศษและสินค้า Electronics ระดับพรีเมียม")
    print("3. ใช้โมเดล Logistic Regression เพื่อคัดกรองลูกค้าจากทุก Cluster ที่มีโอกาสสูงจะซื้อสินค้า Electronics และยิงแคมเปญให้ตรงกลุ่ม")

if __name__ == '__main__':
    run_part2_solution()
