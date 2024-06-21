// Load the data and JSON files
Promise.all([
  d3.csv("Trump Obesity Data - Sheet1.csv"),
  d3.json("states-albers-10m.json")
]).then(([csvData, us]) => {

  const getStateNum = (stateName) => {
    const stateObject = us.objects.states.geometries.find(
      (state) => state.properties.name == stateName
    );
    return stateObject.id;
  };

  // Process the CSV data to match the JSON state IDs
  const data = new Map(
    csvData.map(
      ({
        "State Name": id,
        "Obesity Rate%": obesityRate,
        "Trump Vote %": trumpVote,
      }) => [
        (id = getStateNum(id)),
        [
          parseFloat(obesityRate.replace("%", "")) / 100,
          parseFloat(trumpVote.replace("%", "")) / 100,
        ],
      ]
    )
  );

  const width = 975;
  const height = 610;

  const color = d3
    .scaleSequential(
      d3.extent(Array.from(data.values()).flat()),
      d3.interpolateReds
    )
    .nice();

  const path = d3.geoPath();

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("style", "max-width: 100%; height: auto;");

  svg
    .append("path")
    .datum(topojson.mesh(us, us.objects.states))
    .attr("fill", "none")
    .attr("stroke", "#ccc")
    .attr("d", path);

  function transform(d, year) {
    const [x, y] = path.centroid(d);
    return `
      translate(${x},${y})
      scale(${Math.sqrt(data.get(d.id)[year])})
      translate(${-x},${-y})
    `;
  }

  const state = svg
    .append("g")
    .attr("stroke", "#000")
    .selectAll("path")
    .data(
      topojson
        .feature(us, us.objects.states)
        .features.filter((d) => data.has(d.id))
    )
    .join("path")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("d", path)
    .attr("fill", (d) => color(data.get(d.id)[0]))
    .attr("transform", (d) => transform(d, 0));

  const format = d3.format(".1%");
  state.append("title").text(
    (d) => `${d.properties.name}
Obesity Rate: ${format(data.get(d.id)[0])}
Trump Vote: ${format(data.get(d.id)[1])}`
  );

  document.body.appendChild(svg.node());

  const updateChart = (year) => {
    state
      .transition()
      .duration(750)
      .attr("fill", (d) => color(data.get(d.id)[year]))
      .attr("transform", (d) => transform(d, year));

    // Update legend
    d3.select("#legend").html("");
    const legendTitle = year === 0 ? "Adult obesity (self-reported)" : "Trump vote %";
    const legendSvg = Legend(color, { title: legendTitle, tickFormat: "%" });
    document.getElementById('legend').appendChild(legendSvg);
  };

  // Initial legend
  const legendSvg = Legend(color, { title: "Adult obesity (self-reported)", tickFormat: "%" });
  document.getElementById('legend').appendChild(legendSvg);

  // Listen for radio button changes
  d3.selectAll('input[name="input"]').on("change", function() {
    const year = +this.value;
    updateChart(year);
  });

  window.updateChart = updateChart; // Expose updateChart to the global scope
});
