# Zone Wise Report Dashboard

This is a web-based dashboard application for analyzing zone-wise reports from CSV data files.

## Features

- Upload and process CSV reports
- View zone-wise summary data
- Visualize coverage data with pie charts
- See ward-wise detailed reports
- Identify best and worst performing wards
- Print-friendly report layout

## How to Use

1. Open `index.html` in a web browser
2. Click "Choose File" to upload a CSV report file
3. The dashboard will automatically process the data and display:
   - Zone data summary table
   - Pie charts showing coverage for each zone
   - Ward-wise detailed reports
   - Best and worst performing wards
4. Click "Print Report" to generate a printable version

## CSV File Format

The application expects CSV files with the following columns:
- S.No.
- Zone & Circle
- Ward Name
- Vehicle Number
- Route Name
- Total
- Covered
- Not Covered
- Coverage
- Date
- Start Time
- End Time

## Technical Details

- Built with HTML, CSS, and vanilla JavaScript
- Uses Chart.js for data visualization
- No server required - runs entirely in the browser
- Responsive design works on desktop and mobile devices