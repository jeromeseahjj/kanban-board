// document.querySelector() returns null if document is not found.
const boardEl = document.querySelector("#board");
const debugEl = document.querySelector("#debug");
const addColBtn = document.querySelector("#addColBtn");
const resetBtn = document.querySelector("#resetBtn");
let drag = null;
let suppressNextClick = false;

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
    // addCardBtn.textContent = "+ Card"


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
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
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

boardEl.addEventListener("pointerdown", (e) => {
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  // Only left click for mouse
  if (e.pointerType === "mouse" && e.button !== 0) return;

  const colEl = cardEl.closest(".column");
  const bodyEl = cardEl.closest(".column__body");
  if (!colEl || !bodyEl) return;

  const cardId = cardEl.dataset.cardId;
  const fromColId = colEl.dataset.colId;

  // gives the element’s box in viewport coordinates, which matches clientX/clientY
  const rect = cardEl.getBoundingClientRect();

  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";
  placeholder.style.height = `${rect.height}px`;

  // Insert where card currently is, and link card as a child node.
  bodyEl.insertBefore(placeholder, cardEl);

  cardEl.classList.add("drag-ghost");
  cardEl.style.width = `${rect.width}px`;
  document.body.append(cardEl);

  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  positionGhost(cardEl, e.clientX - offsetX, e.clientY - offsetY);
  cardEl.setPointerCapture(e.pointerId);
  drag = {
    cardId,
    fromColId,
    ghostEl: cardEl,
    placeholderEl: placeholder,
    pointerId: e.pointerId,
    offsetX,
    offsetY,
    didMove: false,
  };
});

boardEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (e.pointerId !== drag.pointerId) return;

  drag.didMove = true;

  const x = e.clientX - drag.offsetX;
  const y = e.clientY - drag.offsetY;
  positionGhost(drag.ghostEl, x, y);

  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  const targetBody = elUnder?.closest?.(".column__body");
  if (!targetBody) return;

  movePlaceholder(targetBody, drag.placeholderEl, e.clientY);
});

boardEl.addEventListener("pointerup", (e) => {
  if (!drag) return;
  if (e.pointerId !== drag.pointerId) return;

  finishDrag();
});

boardEl.addEventListener("pointercancel", (e) => {
  if (!drag) return;
  if (e.pointerId !== drag.pointerId) return;

  finishDrag(true);
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