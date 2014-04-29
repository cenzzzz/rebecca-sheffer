var bbD, bbO, dataSet, svg;

var DIR = "mit14";

var MIN_TEXT = 14;
var BAR_MARGIN = 1;
var TEXT_MARGIN = 2;

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
};

var width = 1200 - margin.left - margin.right;

var height = 600 - margin.bottom - margin.top;

var graph = {
    height: height,
    width: width*1
}

var tab = {
    height: height,
    width: width*0
}

var leads = {}
var follows = {}

function hl_populate(d) {
    if (!(leads[d[0][1]] >= 0))
        leads[d[0][1]] = 0;
    if (!(follows[d[0][2]] >= 0))
        follows[d[0][2]] = 0;
}
function hl_clean(d) {
    if (leads[d[0][1]] === 0)
        delete leads[d[0][1]];
    if (follows[d[0][2]] === 0)
        delete follows[d[0][2]];
}

function hl_bump(d) {
    hl_populate(d);
    leads[d[0][1]] += 1;
    follows[d[0][2]] += 1;
}

function hl_unbump(d) {
    leads[d[0][1]] -= 1;
    follows[d[0][2]] -= 1;
    hl_clean(d);
}

function hl_toggle(d) {
    hl_populate(d);
    if (leads[d[0][1]] > 1 && follows[d[0][2]] > 1) {
        leads[d[0][1]] -= 2;
        follows[d[0][2]] -= 2;
    } else {
        leads[d[0][1]] += 2;
        follows[d[0][2]] += 2;
    }
    hl_clean(d);
}

function is_hl(d) {
    return (leads[couple[0][1]] > 0 || follows[couple[0][2]] > 0);
}

// from http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
var front = function(sel) {
    return sel.each(function(){
        this.parentNode.appendChild(this);
    });
};

var vis = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
    //transform: "translate(" + margin.left + "," + margin.top + ")"
});

var svg = vis.append("svg").attr({
        width: graph.width + margin.left,
        height: graph.height + margin.top + margin.bottom
    }).append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });

var table = vis.append("svg").attr({
        width: tab.width,
        height: tab.height,
        x: margin.left+graph.width,
        y: margin.top
    }).append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });
    
var tip = d3.select("body").append("div")
    .attr("class","tooltip")
    .text("(competitor)");

d3.json("comps.json",function(error,data) {
    console.log(data)
    var sel_html = ''
    for (name in data) {
        sel_html += ("<option value="+data[name]+">"+name+"</option>");
    }
    d3.select("select#comp")
        .html(sel_html)
        .on("change",function() {
            //draw_rnd(data,this.options[this.selectedIndex].value);
        });
});

data = [];
d3.json(DIR+"/res_data.json", function(error,data){
    var sel_html = ''
    data.forEach(function(heat,ii) {
        if (heat[0][".name"][1] !== "-" && ii>0) {
            sel_html += ("<option value="+ii.toString()+">"+heat[0][".name"]+"</option>");
        }
    });
    d3.select("select#round")
        .html(sel_html)
        .on("change",function() {
            draw_rnd(data,this.options[this.selectedIndex].value);
        });
    
    
    draw_rnd(data,2);
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
    //console.log(rnd);
    
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
        .range([graph.width,0]);
    var yy = d3.scale.linear()
        .domain([0,rnd[1].length])
        .range([0,graph.height]);
    var y_gap = yy(1)-yy(0);
    var circle_radius = y_gap/2-BAR_MARGIN;
    var bar_width = y_gap-2*BAR_MARGIN
    
    function set_hl(do_set) {
        var hl_mode = false;
        svg.selectAll("path")
            .each(function(d){
                if (is_hl(d)) {
                    hl_mode = true;
                    front(d3.select(this));
                    d3.select(this).style({
                        "stroke-width":MIN_TEXT+TEXT_MARGIN*2,
                        "opacity":1
                    });
                } else
                    d3.select(this).style({
                        "stroke-width":bar_width,
                        "opacity":0.4
                    });
            });
        svg.selectAll("circle")
            .attr("r",function(d){
                if (is_hl(d)) {
                    front(d3.select(this));
                    return MIN_TEXT/2+TEXT_MARGIN;
                } else
                    return circle_radius;
            });
        
        if (!hl_mode) {
            svg.selectAll("path").style({
                "stroke-width":bar_width,
                "opacity":1
            });
            svg.selectAll("circle").attr("r",circle_radius);
        }
    }
    
    var color = [d3.scale.linear().domain([0,1]).range(["white","white"])];
    for (var ii=1; ii<=n_heats; ii+=1) {
        color[ii] = d3.scale.linear()
            .domain([0,rnd[0][".judges"][ii][1],rnd[0][".judges"][ii][0]])
            .range(["red","lightgrey","green"]);
    }
    
    var dots = svg.selectAll("circle")
        .data(rnd[1])
        
    .enter().append("circle")
        .attr({
            class:"dot",
            r:circle_radius
        })
        .style("fill",function(d) {return color[lh(d)](marks(d,lh(d)))})
        .attr("cx",function(d) {
            return xx(result(d,rnd));
        })
        .style("opacity",function(d) {if (lh(d)===0) return 0; else return 1;})
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
                hl_bump(d);
                set_hl(true);
                front(svg.selectAll("text.note"));
            }
        })
        .on("mousemove", function(){
            tip.style("top", (event.pageY-10)+"px")
                .style("left",(event.pageX+10)+"px");
        })
        .on("mouseout", function(d){
            tip.style("opacity", 0);
            d3.selectAll("text.note")
                .style("opacity", 0);
            
            leads[d[0][1]] -= 1;
            follows[d[0][2]] -= 1;
            
            if (leads[d[0][1]] === 0)
                delete leads[d[0][1]];
            if (follows[d[0][2]] === 0)
                delete follows[d[0][2]];
            
            set_hl(false);
        })
        .on("click", function(d) {
            if (leads[d[0][1]] === 2 && follows[d[0][2]] === 2) {
                delete leads[d[0][1]];
                delete follows[d[0][2]];
            } else {
                leads[d[0][1]] = 2;
                follows[d[0][2]] = 2;
            }
        });
    
    svg.append("text")
        .attr({
            x:graph.width-50,
            y:graph.height-100,
            fill:"black",
            "font-size":"25px",
            "text-anchor":"end"
        })
        .text(rnd[0][".name"])
}