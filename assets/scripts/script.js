class TriviaQuestion {
	constructor(question,incorrectAnswers,correctAnswer) {
		this.question = question;
		//this.answers will hold correctAnswer after processing in randomizeAnswerLocation
		this.answers = incorrectAnswers;
		this.correctAnswer = correctAnswer;
		this.correctAnswerIndex;
		this.randomizeAnswerLocation();	
	}

	//Randomizes location of correct answer in array
	randomizeAnswerLocation() {
		//Add correct answer to answers array
		this.answers.push(this.correctAnswer);	
		if (this.answers.length === 2) {
			//This question is a true or false, need to do special handling so order doesn't give away answer
			this.answers[0] = 'True';
			this.answers[1] = 'False';
			this.correctAnswerIndex = this.correctAnswer === 'True' ? 0 : 1;
		}
		else {
			//Randomize position of correct answer in the answers array and store the location of answer
			this.correctAnswerIndex = Math.floor(Math.random() * this.answers.length);
			//Check if random index was last index, meaing we don't need to swap
			if (this.correctAnswerIndex !== this.answers.length-1){
				let answerHolder = this.answers[this.correctAnswerIndex];
				//Swap correct answer (at last index because of push) with random index
				this.answers[this.correctAnswerIndex] = this.answers[this.answers.length-1];
				this.answers[this.answers.length-1] = answerHolder;
			}
		}
		
	}

	//Returns string of correct answer
	get getCorrectAnswer() {
		return this.correctAnswer;
	}
}


class TriviaGame {
	constructor() {
		//Storage for questions received
		this.questionsList = [];
		this.questionIndex = -1;
		this.answerPicked = false;
		//Stores HTML elements needed by game
		this.questionContainer = $('.question-wrapper');
		this.categoriesContainer = $('#categories-wrapper');
		this.loadingScreenContainer = $('#loading-screen');
		this.messageDisplay = $('#message-display');
		this.questionTimerDisplay = $('#question-timer-display');
		this.questionDisplay = $('#question-display');
		this.answerSlots = $('.answer-option');
		this.scoreScreenDisplay = $('#score-screen-wrapper');
		this.correctAnswersDisplay = $('#correct-answers-display');
		this.incorrectAnswersDisplay = $('#incorrect-answers-display');
		//Used to store interval for question timer
		this.questionTimerInterval;
		this.questionTimer = 0;
		//Score data storage
		this.numberIncorrectAnswers = 0;
		this.numberCorrectAnswers = 0;
		//Session token for API
		this.sessionToken;
		//Initialize game
		this.initialize();
	}

	//Adds event listeners to static HTML and begins HTTP request for categories
	initialize() {
		//Add event listeners to answer slots
		for (let i = 0; i < this.answerSlots.length; i++){
			$(this.answerSlots[i]).on('click',this.checkAnswer.bind(this));
		}
		//Add event listener to restart button
		$('#restart-button').on('click', this.resetGame.bind(this));

		//Show loading screen
		this.updateGameState('loadingPhase');
		
		//Get session token, store once returned
		this.httpGetAsync('https://opentdb.com/api_token.php?command=request', (response) => {
			this.sessionToken = response.token;
			//Begin categories http request
			this.requestCategoriesData();
		});
	}
	
	//This uses an async operation to request and wait for response from requested url
	httpGetAsync(theUrl, callback){
		$.ajax({
			url: theUrl,
			method: "GET"
		}).done(callback);	
	}
	
	//Request async the questions data and process response when ready
	requestQuestionsData(categoryId) {
		this.httpGetAsync(`https://opentdb.com/api.php?amount=10&category=${categoryId}&token=${this.sessionToken}`, (response) => {
			//Success: Response was successful, populate questions
			if (response.response_code === 0) {
				let questionsData = response.results;
				this.populateQuestions(questionsData);
			}
			//Token Empty: Session token used all questions for category, reset token and re-request questions
			if (response.response_code === 4) {
				this.httpGetAsync(`https://opentdb.com/api_token.php?command=reset&token=${this.sessionToken}`, (response) => { 
					//Token has been reset, request questions again
					this.requestQuestionsData(categoryId);
				});
			}
		}); 
	}
	
	//Request async the categories data and process response when ready
	requestCategoriesData() {
		this.httpGetAsync('https://opentdb.com/api_category.php', (response) => 
		{		
			let categoriesData = response.trivia_categories;
			this.populateCategories(categoriesData);
		});
	}

	//Callback for requestQuestionsData to generate TriviaQuestions from data
	populateQuestions(questionsData) {
		//Iterate over questions data and make a new TriviaQuestion for each question in the data
		$.each(questionsData, (index, question) => {
			//Add newly instantiated trivia question object to questions array	
			this.questionsList.push(new TriviaQuestion(question.question,
				question.incorrect_answers,question.correct_answer));				
		});

		//Now in the questionPhase
		this.updateGameState('questionPhase');
	}

	//Callback for requestCategoriesData to generate HTML displays for each category in data
	populateCategories(categoriesData) {
		//Create display box for each category in categoriesData
		$.each(categoriesData, (index, category) => 
		{
			//Create wrapper
			let categoryWrapper = $('<div>', {
				"class": 'category-wrapper',
				//Store categoryId for later use in questions data request
				"data-category-id": category.id,
				click: (event) => {
						//On click, request questions data
						this.requestQuestionsData(event.target.dataset.categoryId);
						//Show loading screen
						this.updateGameState('loadingPhase');					
				}
			});
			
			//This is used by the CSS to align multi-line category names vertically in wrapper
			let categoryOptionPusher = $('<p>', {
				"class": 'category-option-pusher'
			});

			//Create category option content
			let categoryOption = $('<p>', {
				"class": 'category-option',
				//Fill div with content
				text: category.name.indexOf(':') === -1 ? category.name : category.name.split(': ')[1],
			});
			//Append content to wrapper, and wrapper to display 
			categoryWrapper.append(categoryOptionPusher);
			categoryWrapper.append(categoryOption);
			this.categoriesContainer.append(categoryWrapper);
		});

		//Now in the chooseCategoryPhase
		this.updateGameState('chooseCategoryPhase');
	}

	//Used whenever state changes to display correct HTML elements
	updateGameState(newState) {
		switch(newState) {
			case 'loadingPhase':
				//Hide all elements
				this.toggleElementDisplay(this.categoriesContainer,false);
				this.toggleElementDisplay(this.questionContainer,false);
				this.toggleElementDisplay(this.scoreScreenDisplay,false);
				//Display loading screen
				this.toggleElementDisplay(this.loadingScreenContainer, true);
				break;
			case 'chooseCategoryPhase':
				//Hide question and score container and loading screen, display categories container
				this.toggleElementDisplay(this.loadingScreenContainer, false);
				this.toggleElementDisplay(this.categoriesContainer,true);
				this.toggleElementDisplay(this.questionContainer,false);
				this.toggleElementDisplay(this.scoreScreenDisplay,false);
				break;
			case 'questionPhase':
				//Hide categories and loading screen, display question container
				this.toggleElementDisplay(this.loadingScreenContainer, false);
				this.toggleElementDisplay(this.categoriesContainer,false);
				this.toggleElementDisplay(this.questionContainer,true);
				//Activate first question
				this.nextQuestion();
				break;
			case 'scoreScreenPhase':
				//Hide question, display score screen
				this.toggleElementDisplay(this.questionContainer, false);
				this.toggleElementDisplay(this.scoreScreenDisplay, true);
				this.correctAnswersDisplay.text(this.numberCorrectAnswers);
				this.incorrectAnswersDisplay.text(this.numberIncorrectAnswers);
				break;
		}
	}

	//Shows/hides element given in parameters
	toggleElementDisplay(element, doDisplay) {
		if (doDisplay) {
			element.show();
		}
		else {
			element.hide();
		}
	}

	//Callback for answer slot click, checks answer validity
	checkAnswer(event) {
		//User has picked answer already, don't want to process the input
		if (this.answerPicked) {
			return; 	
		}

		if (event.target.innerHTML === this.questionsList[this.questionIndex].getCorrectAnswer) {
			event.target.classList.add('correct-answer');
			this.updateMessageDisplay('That\'s Correct!');
			this.numberCorrectAnswers++;
		} else {
			event.target.classList.add('incorrect-answer');
			this.updateMessageDisplay('Wrong!');
			this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
			this.numberIncorrectAnswers++;
		}


		//Answer has been clicked 
		this.answerPicked = true;
		//Start countdown to move to next question
		this.nextQuestionTimerStart();
	}	
	
	//Advances question index and displays next question content in HTML
	nextQuestion() {
		//Advance to next question
		this.questionIndex++;
		//New question, answer hasn't been picked
		this.answerPicked = false;
		//Reset timer and start countdown
		this.questionTimer = 30;
		this.questionTimerDisplay.html(this.questionTimer);	
		this.questionTimerInterval = setInterval(this.updateQuestionTimer.bind(this),1000);
		//Get current question
		let currentQuestion = this.questionsList[this.questionIndex];
		//Reset win/lost/times up message
		this.updateMessageDisplay('');
		//Populate HTML
		this.questionDisplay.html(currentQuestion.question);

		for (let i = 0; i <  currentQuestion.answers.length; i++)
		{
			this.answerSlots[i].innerHTML = currentQuestion.answers[i];
		}
		//Check if question is a true/false, need to clear 3rd and 4th slots if so
		if (currentQuestion.answers.length < 4) {
			$(this.answerSlots[2]).hide();
			$(this.answerSlots[3]).hide();
		} else {
			//Ensure they are displayed otherwise
			$(this.answerSlots[2]).show();
			$(this.answerSlots[3]).show();
		}
	}
	
	//Callback for question timer interval, updates time and checks if time up
	updateQuestionTimer() {
		this.questionTimer--;
		this.questionTimerDisplay.text(this.questionTimer);
		if (this.questionTimer <= 0) {
			//Times up, move to next question
			this.questionTimeElapsed();
		}
	}

	//Called when question timer ends. Shows correct answer and goes to next question
	questionTimeElapsed() {
		//Display correct answer and times up message
		this.updateMessageDisplay('Time\'s Up!');
		this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
		//Count as wrong since ran out of time
		this.numberIncorrectAnswers++;
		//Move to next question
		this.nextQuestionTimerStart();
	}

	//Starts timer interval for delay between questions and advances to next if there are more questions
	nextQuestionTimerStart() { 
		//Clear question timer interval
		clearInterval(this.questionTimerInterval);
		//Clear answer styles after 2 second delay
		setTimeout(this.resetAnswerStyles.bind(this), 2000);
		//Move to next question if questions are left, else display score screen
		if (this.questionIndex < this.questionsList.length-1) {
			//Give 2 seconds before going to next question
			setTimeout(this.nextQuestion.bind(this), 2000);
		} else {
			//No questions left, update game state to scoreScreenPhase after 2 second delay
			setTimeout(this.updateGameState.bind(this,'scoreScreenPhase'),2000);
		}
	}	

	//Removes CSS styles from all answer slots for correct/incorrect answers
	resetAnswerStyles() {
		$.each(this.answerSlots, (index, slot) => {
			$(slot).removeClass('correct-answer');
			$(slot).removeClass('incorrect-answer');
		});
	}

	//Updates displayed message, used for win/loss/time up conditions
	updateMessageDisplay(message) {
		this.messageDisplay.html(message);
	}

	//Resets game for next 'round'
	resetGame() {
		//Reset variables
		this.questionIndex = -1;
		this.questionsList = [];
		this.answerPicked = false;
		this.numberCorrectAnswers = 0;
		this.numberIncorrectAnswers = 0;
		this.resetAnswerStyles();
		//Now in the chooseCategoryPhase again
		this.updateGameState('chooseCategoryPhase');
	}
} 

let triviaGame = new TriviaGame();
