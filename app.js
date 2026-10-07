const elements = {
  deckCount: document.querySelector('#deck-count'),
  modeButtons: [...document.querySelectorAll('.mode-button')],
  promptDirection: document.querySelector('#prompt-direction'),
  questionNumber: document.querySelector('#question-number'),
  promptLabel: document.querySelector('#prompt-label'),
  promptWord: document.querySelector('#prompt-word'),
  promptHint: document.querySelector('#prompt-hint'),
  answerForm: document.querySelector('#answer-form'),
  answerInput: document.querySelector('#answer-input'),
  feedback: document.querySelector('#answer-feedback'),
  correctCount: document.querySelector('#correct-count'),
  wrongCount: document.querySelector('#wrong-count'),
  revealButton: document.querySelector('#reveal-button'),
  nextButton: document.querySelector('#next-button'),
  nextNote: document.querySelector('#next-note'),
};

let vocabulary = [];
let mode = 'fr-en';
let currentEntry = null;
let currentDirection = 'fr-en';
let previousPrompt = '';
let questionNumber = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let answered = false;

function normalizeVocabulary(value) {
  if (!Array.isArray(value)) {
    throw new Error('Your word list is invalid.');
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Entry ${index + 1} must be an object.`);
    }

    const french = cleanAnswers(entry.french);
    const english = cleanAnswers(entry.english);
    if (french.length === 0 || english.length === 0) {
      throw new Error(`Entry ${index + 1} needs a French phrase and an English translation.`);
    }

    return { french: french[0], english };
  });
}

function cleanAnswers(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.flat(Infinity).filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}

function updateDeckCount() {
  elements.deckCount.textContent = `${vocabulary.length} ${vocabulary.length === 1 ? 'word' : 'words'}`;
}

function choosePrompt() {
  if (!vocabulary.length) {
    currentEntry = null;
    elements.promptDirection.textContent = 'YOUR WORD LIST';
    elements.promptLabel.textContent = 'NOTHING TO PRACTICE YET';
    elements.promptWord.textContent = 'No words available';
    elements.promptHint.textContent = '';
    elements.answerInput.value = '';
    elements.answerInput.disabled = true;
    elements.answerForm.querySelector('button[type="submit"]').hidden = true;
    elements.feedback.textContent = '';
    elements.revealButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.nextNote.textContent = '';
    return;
  }
  const choices = vocabulary.filter((entry) => `${entry.french}|${entry.english[0]}` !== previousPrompt);
  currentEntry = (choices.length ? choices : vocabulary)[Math.floor(Math.random() * (choices.length || vocabulary.length))];
  currentDirection = mode === 'mixed' ? (Math.random() < 0.5 ? 'fr-en' : 'en-fr') : mode;
  previousPrompt = `${currentEntry.french}|${currentEntry.english[0]}`;
  questionNumber += 1;
  answered = false;

  const isFrenchPrompt = currentDirection === 'fr-en';
  const prompt = isFrenchPrompt ? currentEntry.french : currentEntry.english[0];
  elements.promptDirection.textContent = isFrenchPrompt ? 'FRENCH TO ENGLISH' : 'ENGLISH TO FRENCH';
  elements.promptLabel.textContent = isFrenchPrompt ? 'TRANSLATE THIS' : 'TRADUISEZ CECI';
  elements.promptWord.textContent = prompt;
  elements.promptHint.textContent = isFrenchPrompt ? 'Type the English translation' : 'Type the French translation';
  elements.questionNumber.textContent = String(questionNumber).padStart(2, '0');
  elements.answerInput.value = '';
  elements.answerInput.disabled = false;
  elements.feedback.textContent = '';
  elements.feedback.className = 'feedback';
  elements.revealButton.hidden = false;
  elements.nextButton.hidden = true;
  elements.nextNote.textContent = 'One word at a time.';
  elements.answerForm.querySelector('button[type="submit"]').hidden = false;
  elements.answerInput.focus({ preventScroll: true });
}

function normalizeAnswer(value) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function acceptedAnswers() {
  return currentDirection === 'fr-en' ? currentEntry.english : [currentEntry.french];
}

function showResult(isCorrect, revealed = false) {
  answered = true;
  if (isCorrect) {
    correctAnswers += 1;
    elements.correctCount.textContent = String(correctAnswers);
  } else {
    wrongAnswers += 1;
    elements.wrongCount.textContent = String(wrongAnswers);
  }
  elements.answerInput.disabled = true;
  elements.answerForm.querySelector('button[type="submit"]').hidden = true;
  elements.revealButton.hidden = true;
  elements.nextButton.hidden = false;
  elements.nextNote.textContent = '';
  elements.feedback.className = `feedback ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
  elements.feedback.textContent = revealed
    ? `Answer: ${acceptedAnswers().join(' / ')}`
    : isCorrect
      ? 'Très bien. That’s right.'
      : `Not quite. Answer: ${acceptedAnswers().join(' / ')}`;
}

elements.answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (answered) return;
  const guess = normalizeAnswer(elements.answerInput.value);
  if (!guess) {
    elements.feedback.textContent = 'Type a translation first, then check it.';
    return;
  }
  const isCorrect = acceptedAnswers().some((answer) => normalizeAnswer(answer) === guess);
  showResult(isCorrect);
});

elements.revealButton.addEventListener('click', () => showResult(false, true));
elements.nextButton.addEventListener('click', choosePrompt);
document.querySelector('#shuffle-button').addEventListener('click', choosePrompt);

elements.modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    elements.modeButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    choosePrompt();
  });
});

async function initialize() {
  try {
    const response = await fetch('/vocabulary.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('The vocabulary file could not be loaded.');
    vocabulary = normalizeVocabulary(await response.json());
    updateDeckCount();
    choosePrompt();
  } catch {
    elements.deckCount.textContent = '0 words';
    elements.promptDirection.textContent = 'VOCABULARY FILE UNAVAILABLE';
    elements.promptLabel.textContent = 'START THE LOCAL SERVER';
    elements.promptWord.textContent = 'node server.js';
    elements.promptHint.textContent = 'Then open http://127.0.0.1:8000';
    elements.answerInput.disabled = true;
    elements.answerForm.querySelector('button[type="submit"]').hidden = true;
    elements.revealButton.hidden = true;
    elements.nextNote.textContent = '';
  }
}

initialize();