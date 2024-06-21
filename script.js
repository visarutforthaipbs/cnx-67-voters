// Initialize the map
var map = L.map("map").setView([18.79, 98.98], 8); // Adjusted zoom for visibility

// Add tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Function to create a pie chart as an SVG string
function createSvgPieChart(data, size) {
  const total = Object.values(data).reduce((acc, val) => acc + val, 0);
  let startAngle = 0;
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;

  let svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

  Object.entries(data).forEach(([key, value], index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endX = centerX + radius * Math.sin(startAngle + sliceAngle);
    const endY = centerY - radius * Math.cos(startAngle + sliceAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`, // Move to center
      `L ${centerX + radius * Math.sin(startAngle)} ${
        centerY - radius * Math.cos(startAngle)
      }`, // Line to start of slice
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc to end of slice
      "Z", // Close path
    ].join(" ");

    svgContent += `<path d="${pathData}" fill="${colors[index]}" />`;

    startAngle += sliceAngle;
  });

  svgContent += "</svg>";

  return svgContent;
}

// Function to get centroid of a polygon
function getCentroid(coords) {
  var x = 0,
    y = 0,
    area = 0,
    factor;
  for (var i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    var p1 = coords[i],
      p2 = coords[j];
    factor = p1[0] * p2[1] - p2[0] * p1[1];
    x += (p1[0] + p2[0]) * factor;
    y += (p1[1] + p2[1]) * factor;
    area += factor * 3;
  }
  factor = 1 / area;
  return [x * factor, y * factor];
}

// Load the GeoJSON data
fetch("gen-on-map.geojson") // Ensure this path is correct
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    console.log("GeoJSON Data Loaded:", data); // Debugging
    data.features.forEach((feature) => {
      var properties = feature.properties;

      // Extract generation data, ensure valid values
      var generationData = {
        "Gen Z": parseInt(properties["data_without_decimals_Generation Z"], 10),
        Millennials: parseInt(
          properties["data_without_decimals_Millennials"],
          10
        ),
        "Gen X": parseInt(properties["data_without_decimals_Generation X"], 10),
        "Baby Boomers": parseInt(
          properties["data_without_decimals_Baby Boomers"],
          10
        ),
        "Silent Generation": parseInt(
          properties["data_without_decimals_Silent Generation"],
          10
        ),
      };

      console.log("Generation Data:", generationData); // Debugging

      // Check if the data has valid values and is not all zeros
      if (Object.values(generationData).every((val) => val === 0)) {
        console.warn("Skipping zero data for:", feature); // Debugging
        return;
      }

      // Create SVG pie chart
      var pieChartSvg = createSvgPieChart(generationData, 100);

      if (feature.geometry.type === "MultiPolygon") {
        var polygons = feature.geometry.coordinates;

        polygons.forEach((polygon) => {
          var latLngs = polygon[0].map((coord) => [coord[1], coord[0]]);
          L.polygon(latLngs, { color: "blue" }).addTo(map);

          var centroid = getCentroid(polygon[0]);
          console.log("MultiPolygon Centroid:", centroid); // Debugging

          // Create a pie chart icon
          var icon = L.divIcon({
            className: "chart-icon",
            html: pieChartSvg,
            iconSize: [100, 100],
          });

          // Add marker with tooltip
          var marker = L.marker([centroid[1], centroid[0]], {
            icon: icon,
          }).addTo(map);
          marker.bindTooltip(
            `Gen Z: ${generationData["Gen Z"]}<br>
                        Millennials: ${generationData["Millennials"]}<br>
                        Gen X: ${generationData["Gen X"]}<br>
                        Baby Boomers: ${generationData["Baby Boomers"]}<br>
                        Silent Generation: ${generationData["Silent Generation"]}`,
            { permanent: false, direction: "top" }
          );
        });
      } else if (feature.geometry.type === "Polygon") {
        var latLngs = feature.geometry.coordinates[0].map((coord) => [
          coord[1],
          coord[0],
        ]);
        L.polygon(latLngs, { color: "blue" }).addTo(map);

        var centroid = getCentroid(latLngs);
        console.log("Polygon Centroid:", centroid); // Debugging

        // Create a pie chart icon
        var icon = L.divIcon({
          className: "chart-icon",
          html: pieChartSvg,
          iconSize: [100, 100],
        });

        // Add marker with tooltip
        var marker = L.marker([centroid[1], centroid[0]], { icon: icon }).addTo(
          map
        );
        marker.bindTooltip(
          `Gen Z: ${generationData["Gen Z"]}<br>
                    Millennials: ${generationData["Millennials"]}<br>
                    Gen X: ${generationData["Gen X"]}<br>
                    Baby Boomers: ${generationData["Baby Boomers"]}<br>
                    Silent Generation: ${generationData["Silent Generation"]}`,
          { permanent: false, direction: "top" }
        );
      }
    });
  })
  .catch((error) => console.error("Error loading GeoJSON:", error));
