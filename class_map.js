var margin = {top: 20, right: 20, bottom: 20, left: 20};
var padding = 50;
var windowwidth = $(window).width();
var w = document.getElementById("map_col").offsetWidth;
var w2 = document.getElementById("predictions_plot").offsetWidth;
var h2 = 400;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
width = w - margin.left - margin.right,
height = h - margin.top - margin.bottom,

formatNumbers = d3.format(".2f")
formatTemp = d3.format(".2f")
solarColor = "#FCC603"
windColor = "#6baed6"

const getDate = string => (([month, day, year]) => ({ day, month, year }))(string.split('/'));

// https://bl.ocks.org/HarryStevens/1c07d73efaf074de05e63a33431eb80a
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

var svg2 = d3.select("#predictions_plot").append("svg")
    .attr("width", w2 - margin.left - margin.right)
    .attr("height", h2)
    .append("g");

tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

queue()
    .defer(d3.csv, "classification.csv")
    .defer(d3.json, "us.json")
		.defer(d3.csv, "timeseries_fixed.csv")
    .await(callback);

d3.select(".content").append("text")
    .attr("x",width/2)
    .attr("y",height)
		.attr("class", "members")
    .text("Created by Team 70: Meghana Bhimasani, Sunil Bhojwani, Shreya Goddu, Nick Torvik, Yashar John Asbaghi")

//create map and legend
function createMapAndLegend(data,us) {
    // http://bl.ocks.org/dougdowson/9832019
	var counties = topojson.feature(us, us.objects.counties);

	//rollup data
	data.forEach(function(d) {
		d.county = d['actual_county'];
		d.fips = +d['predicted'];
		d.type = d['type'];
		d.state = d['actual_state'];
		d.wind_speed = +d['Wind Speed'];
		d.temp = +d['Temperature_fahrenheit'];
		d.ghi = +d['GHI']
	});

	var dataByCounty = d3.nest()
			.key(function(d) { return d['FIPS']; })
			.map(data);

	counties.features.forEach(function(county) {
		county.properties = dataByCounty[+county.id]
	});

	var projection = d3.geo.albersUsa()
			.translate([width / 2-10, height / 2])
			.scale(windowwidth*0.75);

	var path = d3.geo.path()
			.projection(projection);

	var countyShapes = svg.selectAll(".county")
			.data(counties.features)
			.enter()
			.append("path")
			.attr("class", "county")
			.attr("d", path);

	countyShapes
			.on("mouseover", function(d) {
				tooltip.transition()
						.duration(250)
						.style("opacity", 1);
				tooltip.html(
						"<p><strong>" + d.properties[0].county + ", " + d.properties[0].state + "</strong></p>" +
						"<table><tbody><tr><td class='wide'>Wind Speed:</td><td>" + formatNumbers(d.properties[0].wind_speed) + "</td></tr>" +
						"<tr><td>GHI:</td><td>" + formatNumbers(d.properties[0].ghi) + "</td></tr>" +
						"<tr><td>Temperature (°F):</td><td>" + formatTemp(d.properties[0].temp) + "</td></tr></tbody></table>"
				)
						.style("left", (d3.event.pageX + 20) + "px")
						.style("top", (d3.event.pageY + 38) + "px");
			})
			.on("mouseout", function(d) {
				tooltip.transition()
						.duration(500)
						.style("opacity", 0);
			});

	//populate the counties with solar/wind based on classification
	countyShapes.style("fill", function(d) {
		try {
			if (d.properties[0].type == 'solar') {
				return solarColor
			} else if (d.properties[0].type == 'wind') {
				return windColor
			}
		} catch(err) {
			return "#cccccc"
		}
	});

	svg.append("path")
			.datum(topojson.feature(us, us.objects.states, function(a, b) { return a !== b; }))
			.attr("class", "states")
			.attr("d", path);

	var h2 = document.getElementById("map_col").offsetHeight;

	//build legend
	svg.append("circle")
			.attr("cx",w/2-100)
			.attr("cy",h2*0.12)
			.attr("r", 8)
			.style("fill", solarColor)

	svg.append("circle")
			.attr("cx",w/2+20)
			.attr("cy",h2*0.12)
			.attr("r", 8)
			.style("fill", windColor)
	svg.append("text")
			.attr("x", w/2-80)
			.attr("y", h2*0.12)
			.text("Solar")
			.style("font-size", "20px")
			.style("fill", "white")
			.attr("alignment-baseline","middle")
	svg.append("text")
			.attr("x", w/2+40)
			.attr("y", h2*0.12)
			.text("Wind")
			.style("font-size", "20px")
			.style("fill", "white")
			.attr("alignment-baseline","middle")

	return countyShapes
}

//create line plot
function createLinePlot(predictdata) {

	//process and rollup data on FIPS (county id) and year
	predictdata.forEach(function(d) {
		var date = getDate(d['Date'])
		d.year = +date.year;
		d.price = +d['Price'];
		d.fips = +d['FIPS_x'];
		d.county = d['actual_county'];
		d.state = d['actual_state'];
		d.type = d['type']
	});

	console.log9

	var dataByCountyByYear = d3.nest()
			.key(function(d) { return d.fips; })
			.key(function(d) { return d.year; })
			.rollup(function(v) {
				return {
					county: v[0].county,
					state: v[0].state,
					year: +v[0].year,
					price: d3.mean(v, function(r) {
						return r.price;
					})
				}
			})
			.map(predictdata);

	var dataCountiesByState = d3.group(predictdata, d => d.state, d => d.county)
	let countyFIPSMap = new Map();
	dataCountiesByState.forEach(function(d) {
		for (let entry of d) {
			var countyName = entry[0]
			var countyFIPS = entry[1][0].fips
			countyFIPSMap.set(countyName, countyFIPS)
		}
	})

	let stateArr = Array.from( dataCountiesByState.keys() );
	stateArr.sort();
	// add states to drop down
	for (var i = 0; i < stateArr.length; i++) {
		$('#stateSelect')
				.append($("<option></option>")
						.attr("value", stateArr[i])
						.text(stateArr[i]));
	};

	//dropdown for the county
	var dropdownChange = function() {
        var selectedState = d3.select(this).property('value')
				document.getElementById('countySelect').innerHTML = "";
				var countyMap = dataCountiesByState.get(selectedState)
				let countyArr = Array.from( countyMap.keys() );
				countyArr.sort();
				$('#countySelect')
						.append($("<option></option>")
								.attr("value", "placeholder")
								.text('-'));
				for (var i = 0; i < countyArr.length; i++) {
				$('#countySelect')
						.append($("<option></option>")
								.attr("value", countyArr[i])
								.text(countyArr[i]));
				};
	};

	var dropdownChange2 = function() {
		svg2.selectAll("*").remove()
		var selectedCounty = d3.select(this).property('value')
		var years = []
		var prices = []

		var countyfips = countyFIPSMap.get(selectedCounty)
		var countyData = dataByCountyByYear[countyfips]

		for (var key in countyData) {
			years.push(parseInt(key))
			prices.push(countyData[key].price)
		}

		var maxPrice = d3.max(prices);
		var y = d3.scale.linear()
				.domain([0, maxPrice])
				.range([h2-100,0]);

		var x = d3.scale.linear()
				.domain([years[0], years[4]])
				.range([0,w2-100]);

		var yAxis = d3.svg.axis()
				.orient("left")
				.scale(y)
				.tickValues([]);

		var xAxis = d3.svg.axis()
				.orient("bottom")
				.ticks(5)
				.scale(x)
				.tickFormat(d3.format("d"));

		var line = d3.svg.line()
				.x(function(d, i) {
					return x(d)
				})
				.y(function(d, i) {
					return y(prices[i])
				})

		svg2.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(25," + (h2-50) + ")")
				.call(xAxis);

		svg2.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(25, 50)")
				.call(yAxis);

		svg2.append("g")
			.append("text")
			.attr("transform", "translate(140, 390)")
			.attr("stroke", "white")
			.attr("fill","white")
			.text("*line origin at current trend magnitude")

		svg2.append("g")
			.append("text")
			.attr("transform", "translate(140, 30)")
			.attr("stroke", "white")
			.attr("fill","white")
			.text("Anticipated Price Trend from 2020-2024")


    svg2.append("path").attr("d", line(years))
				.attr("transform", "translate(25, 50)")
				.attr("stroke", '#248f24')
				.attr("stroke-width", "2.5px")
				.attr("width", '5px');
	}


	var dropDown = d3.select("#stateSelect")
			.on("change",dropdownChange);

	var dropDown2 = d3.select('#countySelect')
			.on("change", dropdownChange2)

}

// https://stackoverflow.com/questions/33087405/using-queue-to-load-multiple-files-and-assign-to-globals
function callback(error, data, us, predictdata) {

    var countyShapes = createMapAndLegend(data,us)
	createLinePlot(predictdata)
}
