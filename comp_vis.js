var bbD, bbO, dataSet, svg;

MIN_TEXT = 14;
BAR_MARGIN = 1;
TEXT_MARGIN = 2;

var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};

var width = 1000 - margin.left - margin.right;

var height = 600 - margin.bottom - margin.top;

bbVis = {
    x: 0,
    y: 10,
    w: width,
    h: 50
};

// from http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
var front = function(sel) {
    return sel.each(function(){
        this.parentNode.appendChild(this);
    });
};

svg = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
}).append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });
    
var tip = d3.select("body").append("div")
    .attr("class","tooltip")
    .text("test!");
    
d3.json("res_data.json", function(error,data){
    var sel_html = ''
    data.forEach(function(heat,ii) {
        if (heat[0][".name"][1] !== "-")
            sel_html += ("<option value="+ii.toString()+">"+heat[0][".name"]+"</option>");
    });
    d3.select("select")
        .html(sel_html)
        .on("change",function() {
            draw_rnd(data,this.options[this.selectedIndex].value);
        });
    
    
    draw_rnd(data,15);
});

function lh(d) {
    return d[1][0];
}

function marks(d,h_id) {
    return d[1][1][h_id];
}

function result(d,rnd) {
    var last = lh(d);
    if (last === 0)
        return 0;
    return last - ((d[1][1][last]+1) / (rnd[0][".judges"][last][1]+2));
}

function draw_rnd(data,rnd_id) {
    svg.selectAll("*").remove();
    
    var rnd = data[rnd_id];
    
    rnd[1].sort(function(a,b) {
        var diff = result(a,rnd) - result(b,rnd);
        if (diff !== 0)
            return diff;
        else if (lh(a) === 0) {
            return marks(b,1)-marks(a,1);
        } else {
            for (hn=lh(a); hn<a[1][1].length && diff===0; hn+=1)
                diff = marks(b,hn)-marks(a,hn);
            return diff;
        }
    });
    
    var n_heats = lh(rnd[1][rnd[1].length-1]);
    
    var xx = d3.scale.linear()
        .domain([0,n_heats])
        .range([width,0]);
    var yy = d3.scale.linear()
        .domain([0,rnd[1].length])
        .range([0,height]);
    var y_gap = yy(1)-yy(0);
    var circle_radius = y_gap/2-BAR_MARGIN;
    var bar_width = y_gap-2*BAR_MARGIN
    
    var color = [d3.scale.linear().domain([0,1]).range(["white","white"])];
    for (var ii=1; ii<=n_heats; ii+=1) {
        color[ii] = d3.scale.linear()
            .domain([0,rnd[0][".judges"][ii][1],rnd[0][".judges"][ii][0]])
            .range(["red","lightgrey","green"]);
    }
    
    var dots = svg.selectAll("circle")
        .data(rnd[1])
        
    .enter().append("g")
        .append("circle")
        .attr({
            class:"dot",
            r:circle_radius
        })
        .style("fill",function(d) {return color[lh(d)](marks(d,lh(d)))})
        .attr("cx",function(d) {
            return xx(result(d,rnd));
        })
        .attr("cy",function(d,ii) {
            return yy(ii);
        })
        .attr("y",function(d) {return d3.select(this).attr("cy")})
        
        .each(function(d,ii) {
            for (var jj=n_heats; jj>=d[1][0] && jj>0; jj-=1) {
                svg.append("path")
                    .datum(d)
                    .attr({class:"path"})
                    .attr("d","M"+xx(jj).toString()+" "+yy(ii).toString()+"L"+xx(Math.max(jj-1,result(d,rnd))).toString()+" "+yy(ii).toString())
                    .attr("y",yy(ii))
                    .style({
                        stroke:color[jj](marks(d,jj)),
                        "stroke-width":bar_width
                    });
            }
        })
    
    for (var ii=1; ii<=n_heats; ii+=1) {
        svg.append("text")
            .attr({
                class:"note",
                heat_id:ii,
                x:xx(ii)+TEXT_MARGIN,
                y:0,
                "font-size":(Math.max(MIN_TEXT,y_gap-2)).toString()+"px",
                j_base:rnd[0][".judges"][ii][1]
            })
            .text(function(d){return d3.select(this).attr("j_base")})
    }
    
    svg.selectAll("path,circle")
        .on("mouseover", function(d){
            var bar = d3.select(this)
            tip.html(d[0][0]+"<br/>"+d[0][1]+"<br/>"+d[0][2])
                .style("opacity", 0.9);
            
            svg.selectAll("text.note")
                .attr("y",bar.attr("y"))
                .text(function(e){return marks(d,d3.select(this).attr("heat_id"))+"/"+d3.select(this).attr("j_base")})
                .style("opacity", function(e) {
                    if (d3.select(this).attr("heat_id") >= lh(d))
                        return 0.9;
                    else
                        return 0;
                });
            
            if (parseFloat(svg.select("path").style("stroke-width").split("px")[0]) < MIN_TEXT+TEXT_MARGIN) {
                svg.selectAll("path")
                    .each(function(e){
                        if (bar.attr("y")===d3.select(this).attr("y")) {
                            front(d3.select(this));
                            d3.select(this).style("stroke-width",MIN_TEXT+TEXT_MARGIN*2);
                        } else
                            d3.select(this).style({
                                "stroke-width":bar_width,
                                "opacity":0.4
                            });
                    });
                svg.selectAll("circle")
                    .attr("r",function(e){
                        if (bar.attr("y")===d3.select(this).attr("y")) {
                            front(d3.select(this));
                            return MIN_TEXT/2+TEXT_MARGIN;
                        } else
                            return circle_radius;
                    });
                front(svg.selectAll("text.note"));
            }
        })
        .on("mousemove", function(){
            tip.style("top", (event.pageY-10)+"px")
                .style("left",(event.pageX+10)+"px");
        })
        .on("mouseout", function(){
            tip.style("opacity", 0);
            d3.selectAll("text.note")
                .style("opacity", 0);
            
            svg.selectAll("path").style({
                "stroke-width":bar_width,
                "opacity":1
            });
            svg.selectAll("circle").attr("r",circle_radius);
        });
    
    svg.append("text")
        .attr({
            x:width-50,
            y:height-100,
            fill:"black",
            "font-size":"25px",
            "text-anchor":"end"
        })
        .text(rnd[0][".name"])
}