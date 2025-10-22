function openTab(tabName) {
    const contents = document.getElementsByClassName("tabcontent");
    for (let c of contents) c.style.display = "none";
    document.getElementById(tabName).style.display = "block";
}

openTab("home");

document.getElementById("profileImg").onclick = () => {
    document.getElementById("alert").classList.remove("hidden");
};

function closeAlert() {
    document.getElementById("alert").classList.add("hidden");
}

function showChoices() {
    const camera1 = document.querySelector('input[name="camera1"]:checked').value;
    const camera2 = document.getElementById("camera2").value;
    document.getElementById("choiceOutput").textContent =
    `You chose ${camera1} and ${camera2}.`;
}

function addItem() {
    const input = document.getElementById("todoInput");
    const text = input.value.trim();
    if (!text) return;

    const li = document.createElement("li");
    li.textContent = text;

    li.onclick = () => li.classList.toggle("done");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.onclick = () => li.remove();

    li.appendChild(removeBtn);
    document.getElementById("todoList").appendChild(li);
    input.value = "";
}

