---
title: "Data Transfromation & Visualization with Tidyverse"
author: "Gun Aeng Hub :D"
date: "2024-07-29"
output:
  word_document: default
  html_document: default
  pdf_document: default
---
# Library Package
## Tidyverse
```{r}
library(tidyverse)
#tinytex::install_tinytex(force = TRUE)
```

## nycflights23
```{r}
library(nycflights23)
```

```{r}
# Inspecting the details about nycflights23 dataset

#?flights
#?airlines
#?airports
#?planes
#?weather
```

NYCFlights23 คือ ชุดข้อมูลเกี่ยวกับสายการบินต่างๆที่บินมาที่สนามบินในนิวยอร์ค

- flights dataset เป็นข้อมูลเที่ยวบินทั้งหมดในเมืองนิวยอร์คของปี 2013
- airlines dataset เป็นข้อมูลชื่อสายการบินแบ่งตาม carrier code
- airports dataset เป็นข้อมูลที่เกี่ยวกับสนามบิน อาทิเช่น สนามบิน, ตำแหน่งที่ตั้งของสนามบิน
- plans dataset  เป็นข้อมูลเกี่ยวกับเครื่องบิน อาทิเช่น ปีที่ผลิตเครื่องบิน, รุ่น (Model) ของเครื่องบิน
- weather dataset เป็นข้อมูลสภาพอากาศรายชั่วโมง

Load Some Data
```{r}
head(flights)

print(paste("No of data points:", as.character(nrow(flights))))
print(paste("No of columns:", as.character(ncol(flights))))
```

- จากการสำรวจข้อมูลใน Flight dataset ทำให้รู้ว่ามีข้อมูลที่เก็บในคอลัมน์และแถวทั้งหมด 19 (Column) และ 435352 (Row) และจากข้อมูลตัวอย่างในส่วนบนและท้ายของข้อมูลทั้งหมดพบว่าเป็นข้อมูลเกี่ยวกับการขึ้นบินและลงจอดของสายการบินต่างๆในแต่ละวัน รวมถึงยังมีข้อมูลเกี่ยวกับความล่าช้าของการขึ้นบินและลงจอดของสายการบินแต่ละสายการบินด้วย

=============================================================================

# Data Transformation
## Query Data Best

### Distance

```{r}
unique(flights$carrier)
length(unique(flights$carrier))

airlines # Dataframe that contains full name of flights$carrier
```

```{r}
## Total carrier_distance for each
carrier_distance <-
   flights %>%
   group_by(carrier) %>%
   summarize(sum_distance = sum(distance)) %>%
   select(carrier, sum_distance) %>%
   left_join(airlines, by = "carrier")

carrier_distance
```
---------------------------------------------------------------------

### Descriptive of Range Delay
```{r}
des_delay <- 
    flights %>%
      filter(dep_delay > 0) %>% 
      group_by(carrier) %>%
      summarise(count_delay = n(),
                avg_delay = mean(dep_delay),
                std_delay = sd(dep_delay)) %>%
      left_join(airlines) %>%
      select(name, count_delay, avg_delay, std_delay) %>%
      arrange(desc(count_delay))
```

#### What is the most number of flights in year 2023?
```{r}
count_flights <-
  flights %>%
  group_by(month, carrier) %>%
  summarise(count = n()) %>%
  select(month, 
         carrier,
         count
         ) %>%
  arrange(month, carrier)

count_flights
```

สังเกตว่า ข้อมูลมีเพียง 165 แถวเท่านั้น แต่จาก flights ทั้งหมดมี 14 carrier และ 12 ปี มันควรจะมี 168 แถว หมายความว่ามี 3 แถวที่ไม่มีข้อมูล

```{r}
count_flights %>% 
  group_by(month) %>%
  summarise(count = n())
```

#### What is the flights that not available?
```{r}
month = c(1:12)
carrier = unique(count_flights$carrier)

# จำนวน flights ที่มีเที่ยวบินทั้งหมด
flights_list <- c(paste(count_flights$month, 
                        count_flights$carrier, 
                        sep = "-")
                  ) # len = 165

# จำนวน flights ที่เป็นไปได้เอา month x carrier ได้ 168 ข้อมูล
ideal_list <- c(paste(rep(month, each = 14), 
                      rep(carrier, 12), 
                      sep = '-')
                ) # len = 168

answer <- ideal_list[!ideal_list %in% flights_list]

print(capture.output(
  cat(
    "3 Flights which not active in this year is ...\n", 
    answer
    )
  ))

```

---------------------------------------------------------------------

### Month have most flight

```{r}
most_flight_month <-
 flights %>%
 group_by(month) %>%
 summarize(avg_total_flight= mean(n())) %>%
 arrange(desc(avg_total_flight))

most_flight_month
```

#### What is the month that is the most distance?
```{r}
most_flight_month[1,] # return month and distance
```

---------------------------------------------------------------------

### Most_Airport

```{r}
most_flights_airport <- 
   flights%>%
   group_by(dest)%>%
   summarize(count_flights=n(),.groups='drop') %>%
   left_join(airports,by= c("dest"="faa")) %>%
   arrange(desc(count_flights)) %>%
   slice_head(n=10) %>%
   select(dest,name, count_flights) 

most_flights_airport
```

=============================================================================

# Data Visualization

##  Plot Graph 1
```{r}
ggplot(most_flight_month,
       aes(x=month,y=avg_total_flight)) +
 geom_col(fill="blue",
          alpha=0.3,
          color="black") +
 geom_text(aes(label=round(avg_total_flight,1))
           ,vjust=-0.3,size=3.5)+
 scale_x_continuous(
   breaks= round(unique(most_flight_month$month)))+
 theme_minimal()
```

---------------------------------------------------------------------

## Plot Graph 2 : Total Distance by Carrier
```{r}
ggplot(carrier_distance, 
       aes(x = reorder(name,-sum_distance), 
           y = sum_distance/1000000)) +
 geom_col(fill = "orange", 
          alpha = 0.3, 
          color = "black") +
 theme_minimal() +
 theme(axis.text.x = element_text(angle = 40, hjust = 1)) +
 labs(x = "Carrier", 
      y = "Total Distance (x 10^6 km)", 
      title = "Total Distance by Carrier")
```

---------------------------------------------------------------------

## Plot Graph 3 : Number of Delayed Flights by Airline
```{r}
delay_flights <-
   flights %>%
   filter(dep_delay > 0) %>%
   group_by(carrier) %>%
   summarize(delay_flight = n()) %>%
   select(carrier, delay_flight) %>%
   arrange(desc(delay_flight)) %>%
   left_join(airlines, by = "carrier")
```

PS. You can use des_delay dataframe, but I will create this dataframe ,because i want to practice to create new them.

```{r}
 ggplot(delay_flights, 
        aes(x = reorder(name,-delay_flight), y = delay_flight)) +
   geom_col(fill = "pink", 
            alpha = 0.3, 
            color = "black") +
   geom_text(aes(label = round(delay_flight, 1)), 
             vjust = -0.3, 
             size = 3.5) +
   theme_minimal() +
   theme(axis.text.x = element_text(angle = 40, hjust = 1)) +
   labs(x = "Airline", 
        y = "Number of Delayed Flights", 
        title = "Number of Delayed Flights by Airline")
```

---------------------------------------------------------------------

## Plot Graph 4 : Top 10 Airports by Number of Flights
```{r}
avg_delay_flights <-
   flights %>%
   filter(dep_delay > 0) %>%
   group_by(carrier) %>%
   summarize(delay_flight = mean(dep_delay,na.rm = TRUE)) %>%
   select(carrier, delay_flight) %>%
   arrange(desc(delay_flight)) %>%
   left_join(airlines, by = "carrier")
```


```{r}
 ggplot(most_flights_airport, 
        aes(x = reorder(dest,-count_flights),
            y = count_flights)) +
 geom_col(fill = "light blue", 
          alpha = 0.6, 
          color = "black") +
 geom_text(aes(label = count_flights), 
           vjust =-0.3, 
           size = 3.5) +
 theme_minimal() +
 theme(axis.text.x = element_text(angle = 40, hjust = 1)) +
 labs(x = "Airport Name", 
      y = "Number of Flights", 
      title = "Top 10 Airports by Number of Flights")
```

## Plot 5: Scatter Plot Diagram of distance
```{r}
set.seed(42)
n <- nrow(flights)
id <- sample(1:n, size = 0.5*n) 
train_data <- flights[id,]
```

### Scatter plot month vs. avg_distance
```{r}
df1 <-
  train_data %>%
  group_by(month) %>%
  summarise(avg_distance = mean(distance))

ggplot(data = df1, aes(x = month, y = avg_distance)) + 
  geom_point() +
  geom_smooth()
```

### Scatter plot month vs. avg_distance vs. carrier
```{r}
df2 <-
  train_data %>% 
  filter(dep_delay > 0) %>%
  select(month, carrier, distance, dep_delay, origin) %>%
  group_by(month, carrier, origin) %>%
  summarise(avg_distance = mean(distance),
            avg_dep_delay = mean(dep_delay))

df2
```

```{r}
ggplot(data = df2, aes(x = month, y = avg_distance, color = avg_dep_delay)) +
  geom_point() +
  facet_grid(~ carrier)
```

สังเกตว่าช่วงระทาง 3K เป็นต้นไปค้นพบได้น้อยมาก ซึ่งมีเพียงแค่ Carrier HA เท่านั้นที่เจอ ฉะนั้นจึงเลือกพิจารณากรณีที่ต่ำกว่า 1K และบางเที่ยวบินพอ


```{r}
ggplot(data = df2 %>% filter(avg_distance < 1000 &
                               carrier %in% c("AA", "B6", "DL", "YX")), 
       aes(x = month, y = avg_distance, color = avg_dep_delay)) +
  geom_point() +
  geom_smooth(color = 'red') +
  facet_grid(~ carrier) +
  labs(x = "Month",
       y = "Average of distance (km)")
```

## Plot 6 : Bar chart of popular destination in 2023

### Finding the popular destination 
```{r}
Pop_dest <- flights %>%
              count(dest) %>%
              arrange(-n) %>%
              head(10) %>%
              mutate(
    destination = ifelse(dest=="ATL","Atlanta (ATL)",
                  ifelse(dest=="BQN","Aguadilla (BQN)",
                  ifelse(dest=="FLL","Fort Lauderdale (FLL)",
                  ifelse(dest=="IAD","Washington (IAD)",
                  ifelse(dest=="IAH","Houston (IAH)",
                  ifelse(dest=="MCO","Orlando (MCO)",
                  ifelse(dest=="MIA","Miami (MIA)",
                  ifelse(dest=="ORD","Chicago (ORD)",
                  ifelse(dest=="PBI","West Palm Beach (PBI)",
                  ifelse(dest=="TPA","Tampa (TPA)",
                  ifelse(dest=="BOS","Boston (BOS)",
                  ifelse(dest=="CLT","Charlotte (CLT)",
                  ifelse(dest=="DCA","Washington (DCA)",
                  ifelse(dest=="LAX","Los Angeles (LAX)",     
                  ifelse(dest=="SFO","San Francisco (SFO)","NA" )))))))))))))))
            )
            
Pop_dest
```
### plotting bar chart of popular destination in 2023

```{r}
ggplot(Pop_dest, aes(x = dest , y = n , fill= destination))+
  geom_col(size=5,alpha=0.5)+
  theme_minimal()+
  labs( title = "TOP 10 popular destination in 2023 ",
        x = "Destination",
        y = "The number of Flights" )+
  geom_label( aes(label= n),
              position = position_stack(vjust = 1.05),
              show.legend = FALSE)
```
จากกราฟสรุปได้ว่าสถานที่ที่เป็นที่นิยม หรือมีเที่ยวบินลงจอดมากที่สุด 5 อันดับได้แก่
อันดับที่ 1 : Boston
อันดับที่ 2 : Chicago
อันดับที่ 3 : Orlando
อันดับที่ 4 : Atlanta
อันดับที่ 5 : Miami

---------------------------------------------------------------------

## Plot 7: bar chart of average arrival delay (minutes) by airline

### Finding Average of arrival delay for each airline
```{r}
df3 <- flights %>%
  filter(arr_delay>0)%>%
  group_by(carrier) %>%
  summarise("Mean_Arr" = mean(arr_delay,na.rm = TRUE)) %>%
  left_join(airlines, by = "carrier") 
```  
  
#### Plotting bar chart of average arrival delay (minutes) by airline
```{r}  
ggplot(df3, aes(x = Mean_Arr, y =reorder(carrier,Mean_Arr)  , fill= name))+
  geom_col(size=5,alpha=0.5)+
  theme_minimal()+
  labs( title = "Average Arrival Delay by Carrier",
        x = "Average ariival delay (minutes) ",
        y = "Carrier" )+
  geom_label( aes(label= round(Mean_Arr,2)),
              position = position_stack(vjust = 1.05),
              show.legend = FALSE)
```

- จากกราฟด้านบนเป็นกราฟที่แสดงถึง ค่าเฉลี่ย delay time ของแต่ละสายการบิน โดยเฉลี่ยจากระยะเวลาของเที่ยวบินขาเข้าที่ล่าช้าและแยกตามสายการบินด้วย ซึ่งทำให้รู้ว่าสายการบิน F9 มีค่าเฉลี่ย delay time สูงที่สุด ซึ่งคิดเป็นเวลาเฉลี่ย 67.5 นาทีหรือ 1 ชั่วโมงกว่าเลยทีเดียว

---------------------------------------------------------------------

## Plot 8 : Percent Delay by Carrier in 2023

### Create Dataframe to contains delay and percent delay for each carrier
```{r}
df4 <-  flights %>%
          filter(!is.na(dep_time)) %>%
          count(carrier) %>%
          rename( "count" = "n")
          
df4
```

```{r}
df5 <- flights %>%
        filter(dep_delay > 0 | arr_delay > 0) %>%
        count(carrier) %>%
        rename( "count_delay" = "n") %>%
        left_join(df4, by = "carrier") %>%
        left_join(airlines, by = "carrier") %>%
        mutate(
          percent_delay = round((count_delay/count)*100,2)
        )

df5
```

```{r}
#plotting bar chart of percent delay by airline
ggplot(df5, 
       aes(x = carrier, y =percent_delay, fill= name))+
  geom_col(size = 5,
           alpha = 0.5)+
  theme_minimal()+
  labs( title = "Percent Delay by Carrier in 2023",
        x = "Carrier",
        y = "Percent Delay" )+
  geom_label( aes(label=percent_delay),
              position = position_stack(vjust = 1.05),
              show.legend = FALSE) 
```

- จากกราฟด้านบนเป็นกราฟที่แสดงถึง percent flights delay ในแต่ละสายการบิน โดยคิดจากจำนวนเที่ยวบินของแต่ละสายการบินที่เที่ยวบินล่าช้าเทียบกับจำนวนเที่ยวบินทั้งหมดของสายการบินนั้นๆ ซึ่งพบว่า สายการบินที่มี percent flights delay สูงสุด  3 อันดับ คือ HA, F9 และ WN ตามลำดับ


---------------------------------------------------------------------
Thank you :D









