# R Workshops

Status: Not started
Type: Summarize

# **Analysis of the relationship between PM2.5, forest fires, factories, and the number of patients with respiratory disease in Chiang Mai Province (Thailand).**

# 0. Detail:

**T**his data analysis project came about because I live in the northern region of the country. Currently, there is a problem of very high pm2.5 dust values, especially in Chiang Mai Province. During the holidays, I have collected various information related to various problems, such as pm 2.5 values data from the past 5 years (http:// air4thai.pcd.go.th/webV3/#/Home) The occurrence of forest fire areas. The number of factories in Chiang Mai province in the past 5 years and the number of lost travel patients in the past 5 years

The information I received here is what I want readers to understand: it was created by AI. I use *gemini* AI to help find the information. and found that information was missing. So I have modeled the data as realistically as possible.

But before we start doing it. Let me explain the importance of this problem first: The PM2.5 dust problem is a very serious problem in Thailand right now. PM2.5 is a small dust particle with a diameter not exceeding 2.5 microns, which can enter the walkway system. Humans and animals can breathe directly. Causes various illnesses, especially respiratory system diseases. Including causing ‘**lung cancer’**. Statistics show that the number of lung cancer patients in the northern region of Thailand is the highest in Thailand And the number of patients is increasing each year.

From the above, I would like to analyze the problem. and the relationship of the various data that I collected. (mockup-data)

# **1. Objective :**

1. To analyze the relationship between the increase in PM 2.5 and the occurrence of forest fires in a number of factories.
2. To know the relationship between pm2.5 and patients with respiratory problems.

# **2. KPIS :**

1. Average PM2.5 concentration each year

2. Which month is most valuable? Average pm2.5 is the highest.

3. Number of factories per increase in pm2.5 value

4. Top 5 industries in Chiang Mai Province in 2023

5. Number of areas (acres) where forest fires occur each year.

6. Average of 5 years of data on the relationship between the area (acres) where wildfires occur and the PM2.5 value each month.

7. Number of patients with respiratory disease classified by year

8. Number of patients with respiratory disease Classified by month

# **3. Tools :**

1. R studio for prepare data and clean data.
2. Microsoft excel for fundamental analysis using power pivot.
3. Power BI for power bi for visualization

# **4. prepare data and clean data**

import data to R-studio

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled.png)

# 5.library

```r
library(tidyverse)
library(lubridate)
library(dplyr)
```

---

## 1. Check data for completeness

1. I use the summary function to see if there is any missing information. After checking, it was found that no information was missing.

```r
summary(datapm)
summary(factory)
summary(fire_area)
summary(Respiratory_patients)
```

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%201.png)

2. From the datapm dataset I want to add col_month,col_year and col_num_month Because if using to create graphs in Power, it is very important to have col num_month in sorting.

```r
#add col_year
data <- datapm %>%
 mutate(year = year(date))
#add col_month
data <- data %>%
 mutate(month = tolower(month(date, label = TRUE)))
#add col_num_month
data <- data %>%
 mutate(month = as.character(month)) #convert the data type
data <- data %>%
 mutate(num_month = match(month, tolower(month.abb)))
```

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%202.png)

3. Find the minimum, maximum, and average annual PM2.5 values. Create a table in Excel.

```r
df <- data %>%
  group_by(year) %>%
  summarize(
    min_pm25 = min(pm2.5),
    max_pm25 = max(pm2.5),
    avg_pm25 = ((min(pm2.5) + max(pm2.5)) / 2)
  )
print(df)
```

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%203.png)

4.Number of factories per year

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%204.png)

5. Number of fire areas per year (Acre)

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%205.png)

6.Number of patients with respiratory diseases each year

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%206.png)

7. Take the values that are different. Put it in an excel table.

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%207.png)

8.Find the max, min and average values of pm2.5 for each month in the past 5 years.

```r
dfmonth <- data %>%
 group_by(month,num_month) %>%
 summarize(
 min_pm25 = min(pm2.5),
 max_pm25 = max(pm2.5),
 avg_pm25 = ((min(pm2.5) + max(pm2.5)) / 2)
 )
```

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%208.png)

# **6. Analyze data**

1. Average PM2.5 concentration each yearFrom data from the past 5 years It was found that the average PM2.5 tends to increase every year.

![Untitled](R%20Workshops%203e368f916c95467a84ae236767df1987/Untitled%209.png)

2.Which month is most valuable? Average pm2.5 is the highest

From the average pm2.5 over the past 5 years during March-April. It is the period with the highest pm2.5 value of the year.

![https://miro.medium.com/v2/resize:fit:875/1*Okz0LOc_ahrTeVo9WxOKdQ.png](https://miro.medium.com/v2/resize:fit:875/1*Okz0LOc_ahrTeVo9WxOKdQ.png)

Data from the past 5 years, months that are often valuable pm2.5 highest

3. Number of factories per increase in pm2.5 value

From the data between 2019–2020, there was an increase in the number of factories, resulting in the average PM 2.5 value increasing as well. Even though there were no more factories in 2020, the average PM 2.5 still tends to continue to increase.

![https://miro.medium.com/v2/resize:fit:875/1*nidjQHO3V_cbgYQE5N49pg.png](https://miro.medium.com/v2/resize:fit:875/1*nidjQHO3V_cbgYQE5N49pg.png)

Relationship between the number of factories and pm2.5 values

4. Top 5 industries in Chiang Mai Province in 2023

The top 5 industries in Chiang Mai Province are 1) food industry, 2) construction materials industry, 3) wood and furniture industry, 4) textile industry, and 5) vehicle parts industry, respectively. Although many industries affect the increase in PM 2.5 values, The industries that are likely to have the greatest impact on PM 2.5 are the wood and furniture industries.

![https://miro.medium.com/v2/resize:fit:875/1*CGVpmcHsxYA-AkSFnwlPVQ.png](https://miro.medium.com/v2/resize:fit:875/1*CGVpmcHsxYA-AkSFnwlPVQ.png)

Top 5 industries in Chiang Mai (Thailand) in 2023

5. Number of areas (acres) where forest fires occur each year.

From the data it was found that an increase in the combustion area affected the pm2.5 value.

![https://miro.medium.com/v2/resize:fit:875/1*dgPfGHgn5Zdu3bvmPV9m5w.png](https://miro.medium.com/v2/resize:fit:875/1*dgPfGHgn5Zdu3bvmPV9m5w.png)

Relationship between wood burning area and pm2.5 generation

6. Average of 5 years of data on the relationship between the area (acres) where wildfires occur and the PM2.5 value each month.

From the data, the relationship between the occurrence of pm2.5 and the occurrence of burning areas is related. Between March and April It was found that the most burning areas occurred and the pm2.5 values were also the highest during March-April.

![https://miro.medium.com/v2/resize:fit:875/1*hU8VQ_PiLrh17Sffx1AM8Q.png](https://miro.medium.com/v2/resize:fit:875/1*hU8VQ_PiLrh17Sffx1AM8Q.png)

Relationship between wood burning area and PM2.5 by month

7. Number of patients with respiratory disease per pm2.5 value classified by year

From the data, it was found that there was a relationship between the occurrence of PM2.5 and the number of patients with respiratory problems. The number of patients increases according to the pm2.5 value each year.

![https://miro.medium.com/v2/resize:fit:875/1*5o6ssUVkxITY_qn5dikqEw.png](https://miro.medium.com/v2/resize:fit:875/1*5o6ssUVkxITY_qn5dikqEw.png)

Relationship between respiratory patients and PM2.5 by year

8.Five-year average of data on the relationship between patients respiratory and monthly PM2.5 levels.

From the data, it is found that over the past 5 years, there has been an increase in the number of patients with respiratory diseases, especially in the last month. March-April, which corresponds to high pm2.5 values during those months.

![https://miro.medium.com/v2/resize:fit:875/1*U0q5PzXR7hgtX2kuhWU3QQ.png](https://miro.medium.com/v2/resize:fit:875/1*U0q5PzXR7hgtX2kuhWU3QQ.png)

Relationship between respiratory patients and PM2.5 by month

# **6. Conclusion**

Standard values in the general atmosphere of PM 2.5, annual average of Chiang Mai Province in 2023 is at 117 micrograms per cubic meter. As for the World Health Organization (WHO), it is recommended that the annual average of PM2.5 not exceed 10 micrograms per cubic meter, which is 11.7 times greater, and from historical data, the annual average of PM2.5 in Chiang Mai is likely to increase every year.

The problem of high PM2.5 levels has resulted in an increase in the number of respiratory system patients. In 2023, it was found that the number of patients will be as high as 200,000 people, an increase from 2022 to 3000 people, and there is likely to be The number of patients increased in the following years. If there is still a high level of pm2.5

From the past 5 years of data, it is found that during the month March-April has the highest average number of patients in the year. which corresponds to very high pm2.5 values.

From data analysis The relationship that affects the increase in PM2.5 levels is mainly from burning in forest areas, which is an important part in causing higher PM2.5 levels. In addition, it was found that the increase in the number of factories Industry also causes PM2.5 levels to increase. From the data, it was found that in 2020 the number of factories increased from 948 to 963, with PM2 values increasing 5 from 40 to 80 micrograms per cubic meter.
