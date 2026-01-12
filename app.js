// document.querySelector() returns null if document is not found.
const boardEl = document.querySelector("#board");
const debugEl = document.querySelector("#debug");
const addColBtn = document.querySelector("#addColBtn");
const resetBtn = document.querySelector("#resetBtn");

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload(); // Reloads current URL, basically refreshes the page.
})

// Localstorage
const STORAGE_KEY = "vanilla-kanban:v1";

console.log({ boardEl, debugEl, addColBtn });

const state = loadState() ?? {
  columns: [
    { id: "col-todo", title: "Todo", cardIds: ["c1", "c2"] },
    { id: "col-doing", title: "Doing", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
  ],
  cards: {
    c1: { id: "c1", title: "Render DOM from state" },
    c2: { id: "c2", title: "Click a card to select it" },
  },

  selectedCardId: null,
};

render();

function render() {
  // Clear the board so we can rebuild it from state.
  // Setting innerHTML removes all child nodes.
  boardEl.innerHTML = "";

  // For each column in state, create its DOM structure.
  for (const col of state.columns) {
    const columnEl = document.createElement("div");
    columnEl.className = "column";

    // equivalent of data-col-id
    columnEl.dataset.colId = col.id;

    const headEl = document.createElement("div");
    headEl.className = "column__head";

    const titleEl = document.createElement("div");
    titleEl.className = "column__title";
    titleEl.textContent = col.title;

    const addCardBtn = document.createElement("button");
    addCardBtn.textContent = "+ Card";

    addCardBtn.addEventListener("click", () => {
      const newCard = createCard("New Task");
      state.cards[newCard.id] = newCard;
      col.cardIds.push(newCard.id); // Push into the column
      persist();
      render(); // Re-render
    });

    headEl.append(titleEl, addCardBtn);

    const bodyEl = document.createElement("div");
    bodyEl.className = "column__body";

    for (const cardId of col.cardIds) {
      const card = state.cards[cardId];
      if (!card) continue;

      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.textContent = card.title;
      cardEl.dataset.cardId = card.id;

      // If this card is selected, add a CSS class to highlight it
      if (card.id === state.selectedCardId) {
        cardEl.classList.add("is-selected");
      }

      bodyEl.append(cardEl);
    }
    // appended in this order: card -> body -> column -> board
    columnEl.append(headEl, bodyEl);
    boardEl.append(columnEl);
  }

  const selected = state.selectedCardId
    ? state.cards[state.selectedCardId]
    : null;
  debugEl.textContent = selected
    ? JSON.stringify(selected, null, 2)
    : "(select a card)";
}

// For Card selection
boardEl.addEventListener("click", (e) => {
  // More to future proof things, in-case we add anything inside card element.
  const cardEl = e.target.closest(".card"); // This is basically just, move to the closest .card element.
  // target is where the event originally happened. -> card
  // currentTarget is the element whose listener is running right now. -> board
  console.log("clicked:", e.target, "closest card:", cardEl, "currentTarget", e.currentTarget);

  if (!cardEl) return;

  state.selectedCardId = cardEl.dataset.cardId;
  console.log("selectedCardId =", state.selectedCardId);
  persist();
  render();
});

function createCard(title) {
  return { id: "c-" + crypto.randomUUID(), title };
}

function persist() {
  const json = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, json);
}

function loadState() {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}