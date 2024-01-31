document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.container-button button');

    buttons.forEach(function (button) {
        var tabName = button.getAttribute('onclick').replace("openTab('", '').replace("')", '');

        button.innerHTML = tabName; // Display tab name by default

        button.addEventListener('mouseover', function () {
            button.innerHTML = "Click";
        });

        button.addEventListener('mouseout', function () {
            button.innerHTML = tabName;
        });
    });
});