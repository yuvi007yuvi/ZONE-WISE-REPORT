document.addEventListener('DOMContentLoaded', () => {
    const csvFileInput = document.getElementById('csvFileInput');
    const zoneDataTableBody = document.querySelector('#zoneDataTable tbody');
    const printReportButton = document.getElementById('printReport');
    const reportDateTimeDiv = document.getElementById('reportDateTime');


    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                processCSV(text);
            };
            reader.readAsText(file);
        }
    });

    function processCSV(csvText) {
        const rows = csvText.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        const headers = rows[0].split(',').map(header => header.trim());
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] ? values[index].trim() : '';
            });
            return obj;
        });

        const zoneData = {};
        let totalVehicleEntries = 0;

        data.forEach(item => {
            const zone = item.Zone;
            const total = parseInt(item.Total) || 0;
            const covered = parseInt(item.Covered) || 0;

            if (!zoneData[zone]) {
                zoneData[zone] = { total: 0, covered: 0, entries: 0, vehicles: new Set() };
            }
            zoneData[zone].total += total;
            zoneData[zone].covered += covered;
            zoneData[zone].entries += 1;
            // Assuming 'Vehicle Number' is the header for the vehicle column
            // If the actual header is different, this will need adjustment.
            if (item['Vehicle Number']) {
                zoneData[zone].vehicles.add(item['Vehicle Number']);
                totalVehicleEntries++; // Increment for each entry with a vehicle number
            }
        });

        updateTable(zoneData, totalVehicleEntries);
        createZoneCharts(zoneData);
        updateReportDateTime();
    }

    function updateTable(zoneData, totalVehicleEntries) {
        zoneDataTableBody.innerHTML = ''; // Clear existing table data
        let grandTotal = 0;
        let grandCovered = 0;
        let grandEntries = 0;

        for (const zone in zoneData) {
            const total = zoneData[zone].total;
            const covered = zoneData[zone].covered;
            const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : 0;

            const entries = zoneData[zone].entries;
            const vehiclesCount = zoneData[zone].vehicles.size;
            const row = zoneDataTableBody.insertRow();
            row.insertCell().textContent = zone;
            row.insertCell().textContent = total;
            row.insertCell().textContent = covered;
            row.insertCell().textContent = entries;
            row.insertCell().textContent = `${percentage}%`;
            row.insertCell().textContent = vehiclesCount;

            grandTotal += total;
            grandCovered += covered;
            grandEntries += entries;
        }

        // Add Grand Total row
        const grandTotalRow = zoneDataTableBody.insertRow();
        grandTotalRow.style.fontWeight = 'bold';
        grandTotalRow.insertCell().textContent = 'Grand Total';
        grandTotalRow.insertCell().textContent = grandTotal;
        grandTotalRow.insertCell().textContent = grandCovered;
        grandTotalRow.insertCell().textContent = grandEntries;
        const grandPercentage = grandTotal > 0 ? ((grandCovered / grandTotal) * 100).toFixed(2) : 0;
        grandTotalRow.insertCell().textContent = `${grandPercentage}%`;
        grandTotalRow.insertCell().textContent = totalVehicleEntries;
    }

    printReportButton.addEventListener('click', () => {
        window.print();
    });

    function updateReportDateTime() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        reportDateTimeDiv.textContent = `Report generated on: ${now.toLocaleDateString(undefined, options)}`;
    }

    function createZoneCharts(zoneData) {
        const zoneChartsContainer = document.getElementById('zoneChartsContainer');
        zoneChartsContainer.innerHTML = ''; // Clear previous charts

        for (const zoneName in zoneData) {
            const zone = zoneData[zoneName];
            const coveredPercentage = zone.total > 0 ? (zone.covered / zone.total) * 100 : 0;

            const chartDiv = document.createElement('div');
            chartDiv.className = 'zone-chart-item';
            chartDiv.innerHTML = `
                <h3>${zoneName} (${coveredPercentage.toFixed(2)}%)</h3>
                <canvas id="chart-${zoneName.replace(/\s/g, '-')}"></canvas>
            `;
            zoneChartsContainer.appendChild(chartDiv);

            const ctx = document.getElementById(`chart-${zoneName.replace(/\s/g, '-')}`).getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Covered', 'Not Covered'],
                    datasets: [{
                        data: [coveredPercentage, 100 - coveredPercentage],
                        backgroundColor: [
                            '#4CAF50', // Covered
                            '#FF5722' // Not Covered
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: `Coverage for ${zoneName}`
                        }
                    }
                }
            });
        }
    }
});