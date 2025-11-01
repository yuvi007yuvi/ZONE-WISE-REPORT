document.addEventListener('DOMContentLoaded', () => {
    const csvFileInput = document.getElementById('csvFileInput');
    const zoneDataTableBody = document.querySelector('#zoneDataTable tbody');
    const printReportButton = document.getElementById('printReport');
    const printZoneReportButton = document.getElementById('printZoneReport');
    const zoneSelect = document.getElementById('zoneSelect');
    const reportDateTimeDiv = document.getElementById('reportDateTime');
    let currentZoneData = {};
    let currentWardData = {};


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
        const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const data = rows.slice(1).map(row => {
            // Handle quoted values properly
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/"/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/"/g, ''));
            
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] ? values[index].trim() : '';
            });
            return obj;
        });

        // Zone name mapping
        const zoneNames = {
            '1': '1-City',
            '2': '2-Bhuteshwar',
            '3': '3-Aurangabad',
            '4': '4-Vrindavan'
        };

        const zoneData = {};
        const wardData = {};
        const allWards = [];
        const allUniqueVehicles = new Set();
        let blankVehicleNumberCount = 0;

        data.forEach(item => {
            // Extract zone from "Zone & Circle" column and map to descriptive name
            const rawZone = item["Zone & Circle"];
            const zone = zoneNames[rawZone] || rawZone; // Use mapped name or original if not found
            // Use "Ward Name" column
            const ward = item["Ward Name"];
            // Use the provided values
            const total = parseInt(item.Total) || 0;
            const covered = parseInt(item.Covered) || 0;
            const notCovered = parseInt(item["Not Covered"]) || 0;
            // Use the provided coverage percentage
            const coveragePercentage = parseFloat(item.Coverage) || 0;

            if (!zoneData[zone]) {
                zoneData[zone] = { total: 0, covered: 0, notCovered: 0, entries: 0, vehicles: new Set() };
            }
            zoneData[zone].total += total;
            zoneData[zone].covered += covered;
            zoneData[zone].notCovered += notCovered;
            zoneData[zone].entries += 1;

            if (!wardData[zone]) {
                wardData[zone] = {};
            }
            if (!wardData[zone][ward]) {
                wardData[zone][ward] = { total: 0, covered: 0, notCovered: 0, entries: 0, vehicles: new Set() };
            }
            wardData[zone][ward].total += total;
            wardData[zone][ward].covered += covered;
            wardData[zone][ward].notCovered += notCovered;
            wardData[zone][ward].entries += 1;

            // Use "Vehicle Number" column
            if (item['Vehicle Number'] && item['Vehicle Number'] !== '') {
                zoneData[zone].vehicles.add(item['Vehicle Number']);
                wardData[zone][ward].vehicles.add(item['Vehicle Number']);
                allUniqueVehicles.add(item['Vehicle Number']);
            } else {
                blankVehicleNumberCount++;
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

        // Store current data for zone-specific printing
        currentZoneData = zoneData;
        currentWardData = wardData;

        updateTable(zoneData, allUniqueVehicles.size, blankVehicleNumberCount);
        createZoneCharts(zoneData);
        updateWardTable(wardData);
        displayBestWorstWards(allWards);
        updateReportDateTime();
        updateZoneSelect(zoneData);
    }

    function updateZoneSelect(zoneData) {
        // Clear existing options
        zoneSelect.innerHTML = '<option value="">Select a zone to print</option>';
        
        // Add zones to the dropdown with descriptive names
        for (const zone in zoneData) {
            const option = document.createElement('option');
            option.value = zone;
            option.textContent = zone;
            zoneSelect.appendChild(option);
        }
        
        // Show the zone selection elements
        zoneSelect.style.display = 'inline-block';
        printZoneReportButton.style.display = 'inline-block';
    }

    function updateTable(zoneData, totalUniqueVehicles, blankVehicleNumberCount) {
        zoneDataTableBody.innerHTML = ''; // Clear existing table data
        let grandTotal = 0;
        let grandCovered = 0;

        for (const zone in zoneData) {
            const total = zoneData[zone].total;
            const covered = zoneData[zone].covered;
            const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : 0;

            const row = zoneDataTableBody.insertRow();
            row.insertCell().textContent = zone;
            row.insertCell().textContent = total;
            row.insertCell().textContent = covered;
            row.insertCell().textContent = `${percentage}%`;

            grandTotal += total;
            grandCovered += covered;
        }

        // Add Grand Total row
        const grandTotalRow = zoneDataTableBody.insertRow();
        grandTotalRow.style.fontWeight = 'bold';
        grandTotalRow.insertCell().textContent = 'Grand Total';
        grandTotalRow.insertCell().textContent = grandTotal;
        grandTotalRow.insertCell().textContent = grandCovered;
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
                        <th>Percentage Covered</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            let zoneGrandTotal = 0;
            let zoneGrandCovered = 0;

            for (const wardName in zoneWards) {
                const ward = zoneWards[wardName];
                const total = ward.total;
                const covered = ward.covered;
                const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : 0;

                const row = tbody.insertRow();
                row.insertCell().textContent = wardName;
                row.insertCell().textContent = total;
                row.insertCell().textContent = covered;
                row.insertCell().textContent = `${percentage}%`;

                zoneGrandTotal += total;
                zoneGrandCovered += covered;
            }

            // Add Zone Grand Total row for wards
            const zoneTotalRow = tbody.insertRow();
            zoneTotalRow.style.fontWeight = 'bold';
            zoneTotalRow.insertCell().textContent = 'Zone Total';
            zoneTotalRow.insertCell().textContent = zoneGrandTotal;
            zoneTotalRow.insertCell().textContent = zoneGrandCovered;
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

        // Zone name mapping
        const zoneNames = {
            '1': '1-City',
            '2': '2-Bhuteshwar',
            '3': '3-Aurangabad',
            '4': '4-Vrindavan'
        };

        for (const zone in zoneData) {
            const total = zoneData[zone].total;
            const covered = zoneData[zone].covered;
            const remaining = zoneData[zone].notCovered || (total - covered);

            // Extract the zone number for the chart ID
            const zoneNumber = zone.split('-')[0];
            
            const chartItem = document.createElement('div');
            chartItem.className = 'zone-chart-item';
            chartItem.innerHTML = `<h3>${zone}</h3><canvas id="chart-${zoneNumber}"></canvas>`;
            zoneChartsContainer.appendChild(chartItem);

            const ctx = document.getElementById(`chart-${zoneNumber}`).getContext('2d');
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
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return percentage > 5 ? percentage + '%' : ''; // Only show if > 5%
                            },
                            color: '#fff',
                            font: {
                                weight: 'bold',
                                size: 14
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }
    }

    function updateReportDateTime() {
        const now = new Date();
        reportDateTimeDiv.textContent = `Report generated on: ${now.toLocaleString()}`;
    }

    // Print full report
    printReportButton.addEventListener('click', () => {
        // Ensure all charts are rendered before printing
        setTimeout(() => {
            window.print();
        }, 500); // Small delay to ensure charts are fully rendered
    });

    // Print zone-specific report
    printZoneReportButton.addEventListener('click', () => {
        const selectedZone = zoneSelect.value;
        if (selectedZone) {
            printZoneReport(selectedZone);
        } else {
            alert('Please select a zone to print');
        }
    });

    function printZoneReport(zone) {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        const zoneData = currentZoneData[zone];
        const wardData = currentWardData[zone];
        
        // Get the chart canvas and convert to image
        const chartCanvas = document.getElementById(`chart-${zone.split('-')[0]}`);
        let chartImage = '';
        if (chartCanvas) {
            chartImage = chartCanvas.toDataURL('image/png');
        }
        
        // Generate the HTML for the zone report
        let wardTableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border: 1px solid #2c3e50;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #2c3e50; padding: 8px; background-color: #2ecc71; color: white; font-weight: bold;">Ward</th>
                        <th style="border: 1px solid #2c3e50; padding: 8px; background-color: #2ecc71; color: white; font-weight: bold;">Total</th>
                        <th style="border: 1px solid #2c3e50; padding: 8px; background-color: #2ecc71; color: white; font-weight: bold;">Covered</th>
                        <th style="border: 1px solid #2c3e50; padding: 8px; background-color: #2ecc71; color: white; font-weight: bold;">Percentage Covered</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let zoneGrandTotal = 0;
        let zoneGrandCovered = 0;
        let rowCounter = 0;
        
        for (const wardName in wardData) {
            const ward = wardData[wardName];
            const total = ward.total;
            const covered = ward.covered;
            const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : 0;
            
            // Alternate row colors
            const rowColor = rowCounter % 2 === 0 ? '#ffffff' : '#f8f9fa';
            
            wardTableHTML += `
                <tr style="background-color: ${rowColor};">
                    <td style="border: 1px solid #2c3e50; padding: 8px;">${wardName}</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${total}</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${covered}</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${percentage}%</td>
                </tr>
            `;
            
            zoneGrandTotal += total;
            zoneGrandCovered += covered;
            rowCounter++;
        }
        
        const zoneGrandPercentage = zoneGrandTotal > 0 ? ((zoneGrandCovered / zoneGrandTotal) * 100).toFixed(2) : 0;
        wardTableHTML += `
                <tr style="font-weight: bold; background-color: #ecf0f1;">
                    <td style="border: 1px solid #2c3e50; padding: 8px;">Zone Total</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${zoneGrandTotal}</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${zoneGrandCovered}</td>
                    <td style="border: 1px solid #2c3e50; padding: 8px; text-align: center;">${zoneGrandPercentage}%</td>
                </tr>
            </tbody>
        </table>
        `;
        
        // Write the HTML content to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Zone ${zone} Report</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        background-color: #ffffff;
                        color: #333;
                    }
                    h1 { 
                        text-align: center; 
                        color: #2c3e50;
                    }
                    h2 { 
                        text-align: center; 
                        margin-top: 30px; 
                        color: #34495e;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                    }
                    th, td { 
                        border: 1px solid #2c3e50; 
                        padding: 8px; 
                        text-align: center; 
                    }
                    th { 
                        background-color: #9b59b6; 
                        color: white; 
                        font-weight: bold; 
                    }
                    .summary-table { 
                        width: 50%; 
                        margin: 20px auto; 
                        background-color: #ffffff;
                        border: 1px solid #2c3e50;
                    }
                    .summary-table tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    .logo-container { 
                        text-align: center; 
                        margin-bottom: 20px; 
                    }
                    .logo-container img { 
                        height: 50px; 
                        width: auto; 
                    }
                    .report-header { 
                        text-align: center; 
                        margin-bottom: 20px; 
                        background-color: #ecf0f1;
                        padding: 15px;
                        border-bottom: 2px solid #3498db;
                    }
                    .chart-container { 
                        text-align: center; 
                        margin: 20px 0; 
                        background-color: #ffffff;
                        border: 1px solid #bdc3c7;
                        border-radius: 5px;
                        padding: 10px;
                    }
                    .chart-container img { 
                        max-width: 100%; 
                        height: auto; 
                    }
                    .chart-container h2 {
                        color: #2c3e50;
                        background-color: #ecf0f1;
                        padding: 5px;
                        border-radius: 3px;
                    }
                    #reportDateTime {
                        text-align: right;
                        margin-bottom: 20px;
                        color: #7f8c8d;
                    }
                    /* Ensure colors are printed */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                </style>
            </head>
            <body>
                <div class="logo-container">
                    <img src="logo.png" alt="Company Logo">
                </div>
                <div class="report-header">
                    <h1>POI Zone Wise Report</h1>
                    <h2>Zone ${zone} Detailed Report</h2>
                </div>
                <p id="reportDateTime">Report generated on: ${new Date().toLocaleString()}</p>
                
                <table class="summary-table">
                    <tr>
                        <th>Zone</th>
                        <th>Total</th>
                        <th>Covered</th>
                        <th>Percentage Covered</th>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td>${zone}</td>
                        <td>${zoneData.total}</td>
                        <td>${zoneData.covered}</td>
                        <td>${((zoneData.covered / zoneData.total) * 100).toFixed(2)}%</td>
                    </tr>
                </table>
                
                ${chartImage ? `<div class="chart-container"><h2>POI Coverage Chart for Zone ${zone}</h2><img src="${chartImage}" alt="Coverage Chart"></div>` : ''}
                
                <h2>POI Ward Wise Report for Zone ${zone}</h2>
                ${wardTableHTML}
            </body>
            </html>
        `);
        
        // Close the document and trigger print
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }
});