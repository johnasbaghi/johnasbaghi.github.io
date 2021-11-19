var margin = {top: 20, right: 20, bottom: 20, left: 20};
var padding = 50;
var windowwidth = $(window).width();
var w = document.getElementById("attr_col").offsetWidth;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
width = w - margin.left - margin.right,
height = h - margin.top - margin.bottom,

formatNumbers = d3.format(".2f")
var legendText = ["Low", " ", "", "", "", "", "High"];
var legendColors = [];
var ghiLegendColors = ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#4a1486"];
var windLegendColors = ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"];
var ghiColor = d3.scale.quantize()
var windColor = d3.scale.quantize()

// https://bl.ocks.org/HarryStevens/1c07d73efaf074de05e63a33431eb80a
var svg = d3.select("#attr_col").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(0," + margin.top + ")");

tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");
tooltip2 = d3.select("body").append("div")
    .attr("class", "tooltip");

queue()
    .defer(d3.csv, "classification.csv")
    .defer(d3.json, "us.json")
    .await(callback);

//create map and legend
function createMapAndLegend(data,us,selectedAttr) {
    // http://bl.ocks.org/dougdowson/9832019
    var counties = topojson.feature(us, us.objects.counties);

    if(selectedAttr == 'G') {
        legendColors = ghiLegendColors
    } else {
        legendColors = windLegendColors
    }

    //parse data and group by FIPS (county id)
    data.forEach(function(d) {
		d.county = d['actual_county'];
		d.fips = +d['predicted'];
		d.type = d['type'];
		d.state = d['actual_state'];
		d.wind_speed = +d['Wind Speed'];
		d.temp = +d['Temperature_fahrenheit'];
		d.ghi = +d['GHI'];
	});

    var dataByCounty = d3.nest()
		.key(function(d) { return d['FIPS']; })
		.map(data);

    counties.features.forEach(function(county) {
		county.properties = dataByCounty[+county.id]
    });

    var projection = d3.geo.albersUsa()
	.translate([width / 2, height / 2])
	.scale(windowwidth*0.75);

    var path = d3.geo.path()
	.projection(projection);

    ghiColor = ghiColor.domain([
    	d3.min(data,function(d) {
			return d.ghi;
		}), d3.max(data,function(d) {
			return d.ghi;
		})]).range(ghiLegendColors)

	windColor = windColor.domain([
		d3.min(data,function(d) {
			return d.wind_speed;
		}), d3.max(data,function(d) {
			return d.wind_speed;
		})]).range(windLegendColors)

    var countyShapes = svg.selectAll(".county")
		.data(counties.features)
		.enter()
		.append("path")
		.attr("class", "county")
		.attr("d", path);
    
    svg.append("path")
		.datum(topojson.feature(us, us.objects.states, function(a, b) { return a !== b; }))
		.attr("class", "states")
		.attr("d", path);

    //build legend
    var legend = svg.append("g")
		.attr("id", "legend");

    var legenditem = legend.selectAll(".legenditem")
		.data(d3.range(8))
		.enter()
		.append("g")
		.attr("class", "legenditem")
		.attr("transform", function(d, i) { return "translate(" + ((i * 28)-280) + ",150)"; });

    legenditem.append("rect")
		.attr("x", width - 240)
		.attr("y", -7)
		.attr("width", 30)
		.attr("height", 6)
		.attr("class", "rect")
		.style("fill", function(d, i) { return legendColors[i]; });

    legenditem.append("text")
		.attr("x", width-212)
		.attr("y", -9)
		.style("font-size", "15px")
		.style("fill", "white")
		.style("text-anchor", "middle")
		.text(function(d, i) { return legendText[i]; });

	return countyShapes

}

// https://stackoverflow.com/questions/33087405/using-queue-to-load-multiple-files-and-assign-to-globals
function callback(error, data, us) {

	//build dropdown
    var chosenDropDownOption = "None";

    var dropDownList = [
        [1, "G", "GHI"],
        [2, "W", "Wind Speed"]
    ];

    var dropdownChange = function() {
        var selectedAttr = d3.select(this).property('value')
        createMapAndLegend(data,us,selectedAttr);
        update(selectedAttr);
    };

    var dropDown = d3.select(".selector")
        .append("select")
        .attr('id', 'dropDownId')
        .on("change",dropdownChange);

    var options = dropDown.selectAll('option')
        .data(dropDownList)
        .enter()
        .append('option')
        .attr('value', (d) => d[1])
        .text((d) => d[2]);

    options.property("selected", function(d) {
        return d[2] === chosenDropDownOption
    });

    var countyShapes = createMapAndLegend(data,us,'G')
    update('G');

    //update map/legend colors and tooltip
    function update(selectedAttr){
		countyShapes.style("fill", function(d) {
			try {
				if(selectedAttr === 'G') {
					return ghiColor(d.properties[0].ghi)
				} else {
					return windColor(d.properties[0].wind_speed)
				}
			} catch(err) {
				return "#cccccc"
			}

		});

		function updateTooltip(d, selectedAttr) {
			var htmlString = "";
			if(selectedAttr === 'G') {
				htmlString = "<p><strong>" + d.properties[0].county + ", " + d.properties[0].state + "</strong></p>" +
					"<table><tbody><tr><td class='wide'>GHI (W/m<sup>2</sup>):</td><td>"
						+ formatNumbers(d.properties[0].ghi) + "</td></tr>" +
					"</tbody></table>";
			} else {
				htmlString = "<p><strong>" + d.properties[0].county + ", " + d.properties[0].state + "</strong></p>" +
					"<table><tbody><tr><td class='wide'>Wind Speed (m/s):</td><td>"
						+ formatNumbers(d.properties[0].wind_speed) + "</td></tr>" +
					"</tbody></table>"
			}
			return htmlString;
		}

		countyShapes.on("mouseover", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 1)
			tooltip.html(updateTooltip(d,selectedAttr))
			.style("left", (d3.event.pageX + 20) + "px")
			.style("top", (d3.event.pageY + 38) + "px");

		}).on("mouseout", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 0)
		});
    }


}
