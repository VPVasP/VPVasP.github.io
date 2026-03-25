let chart;

function formatEuro(num) {
    return num
        .toFixed(0)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calculateFutureValue(monthly, years, rate) {
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;

    let futureValue = 0;
    let contributions = 0;

    const chartData = [];

    for (let i = 1; i <= months; i++) {
        contributions += monthly;
        futureValue = (futureValue + monthly) * (1 + monthlyRate);

        if (i % 12 === 0) {
            chartData.push({
                year: i / 12,
                value: futureValue
            });
        }
    }

    return { futureValue, contributions, chartData };
}

// NEW: Auto-set return rate based on selected asset
const assetSelect = document.getElementById("assetSelect");
const returnRateInput = document.getElementById("returnRate");

assetSelect.addEventListener("change", () => {
    switch (assetSelect.value) {
        case "sp500":
            returnRateInput.value = 10;
            break;
        case "nasdaq":
            returnRateInput.value = 13;
            break;
        case "dowjones":
            returnRateInput.value = 7;
            break;
        case "bitcoin":
            returnRateInput.value = 40;
            break;
    }
});

document.getElementById("calculate").addEventListener("click", () => {
    const monthly = parseFloat(document.getElementById("monthly").value);
    const years = parseFloat(document.getElementById("years").value);
    const rate = parseFloat(document.getElementById("returnRate").value);

    const result = calculateFutureValue(monthly, years, rate);

    const contributions = formatEuro(result.contributions);
    const futureValue = formatEuro(result.futureValue);
    const profit = formatEuro(result.futureValue - result.contributions);

    document.getElementById("contributions").innerText = `${contributions} €`;
    document.getElementById("futureValue").innerText = `${futureValue} €`;
    document.getElementById("profit").innerText = `${profit} €`;

    drawChart(result.chartData);
});

function drawChart(data) {
    const ctx = document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => "Year " + d.year),
            datasets: [{
                label: "Portfolio Value (€)",
                data: data.map(d => d.value),
                borderColor: "#2ea043",
                backgroundColor: "rgba(46, 160, 67, 0.2)",
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value
                                .toFixed(0)
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
                        }
                    }
                }
            }
        }
    });
}
