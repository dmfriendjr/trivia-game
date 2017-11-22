class TriviaQuestion {
	constructor(question,answers,correctAnswerIndex) {
		this.question = question;
		this.answers = answers;
		this.correctAnswerIndex = correctAnswerIndex;
	}

	get correctAnswer() {
		return this.answers[this.correctAnswerIndex];
	}
}


class TriviaGame {
	constructor() {
		this.questionsList = [];
		this.questionIndex = -1;
		this.answerPicked = false;
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
		this.questionTimerInterval;
		this.questionTimer = 0;
		this.numberIncorrectAnswers = 0;
		this.numberCorrectAnswers = 0;
		this.initialize();
	}

	initialize() {
		//Add event listeners to answer slots
		console.log('Initializing');
		for (let i = 0; i < this.answerSlots.length; i++){
			$(this.answerSlots[i]).on('click',this.checkAnswer.bind(this));
		}
		//Add event listener to restart button
		$('#restart-button').on('click', this.resetGame.bind(this));
		//Begin categories http request
		this.requestCategoriesData();
		//Show loading screen
		this.updateGameState('loadingPhase');
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
		this.httpGetAsync(`https://opentdb.com/api.php?amount=10&category=${categoryId}`, (response) => {
			let questionsData = response.results;
			this.populateQuestions(questionsData);
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

	populateQuestions(questionsData) {
		//Iterate over questions data and make a new TriviaQuestion for each question in the data
		$.each(questionsData, (index, question) => {
			//Add correct answer to incorrect answers array
			let answersArray = question.incorrect_answers;
			answersArray.push(question.correct_answer);
			let correctAnswerIndex;
			if (answersArray.length === 2) {
				//This question is a true or false, need to do special handling so order doesn't give away answer
				answersArray[0] = 'True';
				answersArray[1] = 'False';
				correctAnswerIndex = question.correct_answer === 'True' ? 0 : 1;
			}
			else {
				//Randomize position of correct answer in the answers array and store the location of answer
				correctAnswerIndex = Math.floor(Math.random() * answersArray.length);
				//Check if random index was last index, meaing we don't need to swap
				if (correctAnswerIndex !== answersArray.length-1){
					let answerHolder = answersArray[correctAnswerIndex];
					//Swap correct answer (at last index because of push) with random index
					answersArray[correctAnswerIndex] = answersArray[answersArray.length-1];
					answersArray[answersArray.length-1] = answerHolder;
				}
			}


			//Add newly instantiated trivia question object to questions array	
			this.questionsList.push(new TriviaQuestion(question.question,
				answersArray,correctAnswerIndex));				
		});

		//Now in the questionPhase
		this.updateGameState('questionPhase');
	}

	//Display a category in each category slot for data recieved
	populateCategories(categoriesData) {
		//Create display box for each category in categoriesData
		$.each(categoriesData, (index, category) => 
		{
			//Create wrapper
			let categoryWrapper = $('<div>', {
				"class": 'category-wrapper',
			});
			
			//This is used by the CSS to align multi-line category names vertically in wrapper
			let categoryOptionPusher = $('<p>', {
				"class": 'category-option-pusher'
			});

			//Create category option content
			let categoryOption = $('<p>', {
				"class": 'category-option',
				//Store categoryId for later use in questions data request
				"data-category-id": category.id,
				//Fill div with content
				text: category.name.indexOf(':') === -1 ? category.name : category.name.split(': ')[1],
				click: (event) => {
					//On click, request questions data
					this.requestQuestionsData(event.target.dataset.categoryId);
					//Show loading screen
					this.updateGameState('loadingPhase');
				}
			});
			//Append content to wrapper, and wrapper to display 
			categoryWrapper.append(categoryOptionPusher);
			categoryWrapper.append(categoryOption);
			this.categoriesContainer.append(categoryWrapper);
		});

		//Now in the chooseCategoryPhase
		this.updateGameState('chooseCategoryPhase');
	}

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

	toggleElementDisplay(element, doDisplay) {
		if (doDisplay) {
			element.show();
		}
		else {
			element.hide();
		}
	}

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

	checkAnswer(event) {
		//User has picked answer already, don't want to process the input
		if (this.answerPicked) {
			return; 	
		}

		if (event.target.innerHTML === this.questionsList[this.questionIndex].correctAnswer) {
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
		//Determine if we want to advance to the next question (ie there are questions left)
		//Have to do length-1 here since questionsIndex gets incremented by nextQuestion()
		if (this.questionIndex < this.questionsList.length-1){	
			//do a small delay then advance to next question and reset answer styles
			this.nextQuestionTimerStart();
		} else {
			//No questions left, clear question interval, update game state after delay
			clearInterval(this.questionTimerInterval);
			setTimeout(this.updateGameState.bind(this,'scoreScreenPhase'),2000);
		}
	}

	questionTimeElapsed() {
		this.updateMessageDisplay('Time\'s Up!');
		this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
		this.nextQuestionTimerStart();
	}

	nextQuestionTimerStart() { 
		//Clear question timer interval
		clearInterval(this.questionTimerInterval);
		//Give 2 seconds before resetting answer styling and going to next question
		setTimeout(this.resetAnswerStyles.bind(this), 2000);
		setTimeout(this.nextQuestion.bind(this), 2000);
	}

	resetAnswerStyles() {
		$.each(this.answerSlots, (index, slot) => {
			$(slot).removeClass('correct-answer');
			$(slot).removeClass('incorrect-answer');
		});
	}

	updateQuestionTimer() {
		this.questionTimer--;
		this.questionTimerDisplay.text(this.questionTimer);
		if (this.questionTimer <= 0) {
			//Times up, move to next question
			this.questionTimeElapsed();
		}
	}

	updateMessageDisplay(message) {
		this.messageDisplay.html(message);
	}

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
