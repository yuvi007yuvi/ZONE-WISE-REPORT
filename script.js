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
        const wardData = {};
        let totalVehicleEntries = 0;
        const allWards = [];

        data.forEach(item => {
            const zone = item.Zone;
            const ward = item.Ward; // Assuming 'Ward' is the header for the ward column
            const total = parseInt(item.Total) || 0;
            const covered = parseInt(item.Covered) || 0;

            if (!zoneData[zone]) {
                zoneData[zone] = { total: 0, covered: 0, entries: 0, vehicles: new Set() };
            }
            zoneData[zone].total += total;
            zoneData[zone].covered += covered;
            zoneData[zone].entries += 1;

            if (!wardData[zone]) {
                wardData[zone] = {};
            }
            if (!wardData[zone][ward]) {
                wardData[zone][ward] = { total: 0, covered: 0, entries: 0, vehicles: new Set() };
            }
            wardData[zone][ward].total += total;
            wardData[zone][ward].covered += covered;
            wardData[zone][ward].entries += 1;

            // Assuming 'Vehicle Number' is the header for the vehicle column
            if (item['Vehicle Number']) {
                zoneData[zone].vehicles.add(item['Vehicle Number']);
                wardData[zone][ward].vehicles.add(item['Vehicle Number']);
                totalVehicleEntries++; // Increment for each entry with a vehicle number
            }
        });

        // Calculate percentages for all wards and store them
        for (const zoneName in wardData) {
            for (const wardName in wardData[zoneName]) {
                const ward = wardData[zoneName][wardName];
                const percentage = ward.total > 0 ? ((ward.covered / ward.total) * 100) : 0;
                allWards.push({ zone: zoneName, ward: wardName, percentage: parseFloat(percentage.toFixed(2)) });
            }
        }

        updateTable(zoneData, totalVehicleEntries);
        createZoneCharts(zoneData);
        updateWardTable(wardData);
        displayBestWorstWards(allWards);
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
            row.insertCell().textContent = vehiclesCount;
            row.insertCell().textContent = `${percentage}%`;

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
        grandTotalRow.insertCell().textContent = totalVehicleEntries;
        const grandPercentage = grandTotal > 0 ? ((grandCovered / grandTotal) * 100).toFixed(2) : 0;
        grandTotalRow.insertCell().textContent = `${grandPercentage}%`;
    }

    function updateWardTable(wardData) {
        const wardReportContainer = document.getElementById('wardReportContainer');
        wardReportContainer.innerHTML = ''; // Clear previous content

        for (const zoneName in wardData) {
            const zoneWards = wardData[zoneName];

            const zoneHeader = document.createElement('h3');
            zoneHeader.textContent = `Zone: ${zoneName}`;
            wardReportContainer.appendChild(zoneHeader);

            const table = document.createElement('table');
            table.className = 'ward-data-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Ward</th>
                        <th>Total</th>
                        <th>Covered</th>
                        <th>TOTAL ROUTES</th>
                        <th>VEHICLES ON ROUTE</th>
                        <th>Percentage Covered</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            let zoneGrandTotal = 0;
            let zoneGrandCovered = 0;
            let zoneGrandEntries = 0;
            let zoneGrandVehicles = new Set();

            for (const wardName in zoneWards) {
                const ward = zoneWards[wardName];
                const total = ward.total;
                const covered = ward.covered;
                const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : 0;

                const row = tbody.insertRow();
                row.insertCell().textContent = wardName;
                row.insertCell().textContent = total;
                row.insertCell().textContent = covered;
                row.insertCell().textContent = ward.entries;
                row.insertCell().textContent = ward.vehicles.size;
                row.insertCell().textContent = `${percentage}%`;

                zoneGrandTotal += total;
                zoneGrandCovered += covered;
                zoneGrandEntries += ward.entries;
                ward.vehicles.forEach(v => zoneGrandVehicles.add(v));
            }

            // Add Zone Grand Total row for wards
            const zoneTotalRow = tbody.insertRow();
            zoneTotalRow.style.fontWeight = 'bold';
            zoneTotalRow.insertCell().textContent = 'Zone Total';
            zoneTotalRow.insertCell().textContent = zoneGrandTotal;
            zoneTotalRow.insertCell().textContent = zoneGrandCovered;
            zoneTotalRow.insertCell().textContent = zoneGrandEntries;
            zoneTotalRow.insertCell().textContent = zoneGrandVehicles.size;
            const zoneGrandPercentage = zoneGrandTotal > 0 ? ((zoneGrandCovered / zoneGrandTotal) * 100).toFixed(2) : 0;
            zoneTotalRow.insertCell().textContent = `${zoneGrandPercentage}%`;

            wardReportContainer.appendChild(table);
        }
    }

    function displayBestWorstWards(allWards) {
        const bestWorstWardsContainer = document.getElementById('bestWorstWardsContainer');
        bestWorstWardsContainer.innerHTML = ''; // Clear previous content

        // Sort wards by percentage in descending order for best wards
        const sortedWards = [...allWards].sort((a, b) => b.percentage - a.percentage);

        // Get top 3 best wards
        const bestWards = sortedWards.slice(0, 3);

        // Get top 3 worst wards (lowest percentage)
        const worstWards = sortedWards.slice(-3).sort((a, b) => a.percentage - b.percentage);

        // Function to create a table for wards
        function createWardTable(title, wards, type) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = `ward-performance-section ${type}`;
            sectionDiv.innerHTML = `<h3>${title}</h3>`;

            const table = document.createElement('table');
            table.className = 'ward-performance-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Zone</th>
                        <th>Ward</th>
                        <th>Coverage Percentage</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            wards.forEach(ward => {
                const row = tbody.insertRow();
                row.insertCell().textContent = ward.zone;
                row.insertCell().textContent = ward.ward;
                row.insertCell().textContent = `${ward.percentage}%`;
            });
            sectionDiv.appendChild(table);
            return sectionDiv;
        }

        // Display Best Wards in a table
        bestWorstWardsContainer.appendChild(createWardTable('Top 3 Best Performing Wards (by Coverage)', bestWards, 'best'));

        // Display Worst Wards in a table
        bestWorstWardsContainer.appendChild(createWardTable('Top 3 Worst Performing Wards (by Coverage)', worstWards, 'worst'));
    }

    function createZoneCharts(zoneData) {
        const zoneChartsContainer = document.getElementById('zoneChartsContainer');
        zoneChartsContainer.innerHTML = ''; // Clear previous charts

        for (const zone in zoneData) {
            const total = zoneData[zone].total;
            const covered = zoneData[zone].covered;
            const remaining = total - covered;

            const chartItem = document.createElement('div');
            chartItem.className = 'zone-chart-item';
            chartItem.innerHTML = `<h3>${zone}</h3><canvas id="chart-${zone}"></canvas>`;
            zoneChartsContainer.appendChild(chartItem);

            const ctx = document.getElementById(`chart-${zone}`).getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Covered', 'Remaining'],
                    datasets: [{
                        data: [covered, remaining],
                        backgroundColor: ['#28a745', '#dc3545'],
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
                            text: `Coverage for Zone ${zone}`
                        }
                    }
                }
            });
        }
    }

    function updateReportDateTime() {
        const now = new Date();
        reportDateTimeDiv.textContent = `Report generated on: ${now.toLocaleString()}`;
    }

    printReportButton.addEventListener('click', () => {
        window.print();
    });
});