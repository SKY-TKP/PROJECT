print("Pao-Ying-Game Jaaa")
no_turns <- as.numeric(readline("No.of turn: "))

## Variables
i = 1
score = 0
resulting_df = c()

## Resulting Game
resulting <- function(user_hand, comp_hand){
  if(user_hand %in% c(1, 2, 3)){
    if(user_hand == 1 & comp_hand == 2) {return (result = TRUE)}
    else{return (result = FALSE)}
    
    if(user_hand == 2 & comp_hand == 1) {return (result = TRUE)}
    else{return (result = FALSE)}
    
    if(user_hand == 3 & comp_hand == 1) {return (result = TRUE)}
    else{return (result = FALSE)}
  }
  else{return (FALSE)}
}

## Game Functions
game <- function(){
  hands <- c(1, 2, 3)
  comp_hand <- sample(hands,1)
  text <- c("1: Hammer", "2: Scissors", "3: Paper")
  writeLines(text)
  
  user_hand <- as.numeric(readline("Choose your hand: "))
  result <- (user_hand == comp_hand)
  
  if(!(user_hand %in% hands)){
    print("Hey! why you put number no between 1 to 3?")
  }
  result <- resulting(user_hand, comp_hand)
  return (data.frame(result, user_hand, comp_hand,
                     resulting = if(result){"WIN"}
                                  else{ 
                                    ifelse(user_hand == comp_hand, "DRAW", "LOSE") 
                                    }
                       )
          )
}

while(i <= no_turns){
  print(paste("Round",as.character(i),sep = " "))
  
  ## Scoring
  df_result_each_game <- game()
  comp_choose <- paste("Comp choose:",
                       df_result_each_game$comp_hand, 
                       sep = " ")
  
  if(df_result_each_game$result){
    print( comp_choose )
    print("Wow you good!")
    score = score + 1
  }else{
    print( comp_choose )
    print("Try Again")
  }
  resulting_df <- rbind(resulting_df, 
                        df_result_each_game)
  #print(resulting_df)
  print("#-----------------")
  
  ## Anouncement
  if(i == no_turns){
    print("== SUMMARY ==")
    
    print(paste("Your Score:",
                as.character(score), sep = " "))
    
    print(
      if(score > 0.5*no_turns){
        "You WIN!"
      }else if(score == 0.5*no_turns){
        "DRAW"
      }else{"You LOSE!"}
      )
    
    print(data.frame(round = 1:no_turns,
                 user_hand = resulting_df$user_hand,
                 comp_hand = resulting_df$comp_hand,
                 result    = resulting_df$resulting,
                 score     = as.numeric(resulting_df$result)
    )
    )
  }
  
  i = i + 1
}






  
  