var MIN_TEXT = 14;
var BAR_MARGIN = 1;
var TEXT_MARGIN = 2;

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
};

//var pane = [[0,0],[0,0]];
var pane = [[0,0]];
var svg = [];
pane.forEach(function(d){
    svg.push([]);
})

var width = Math.max(400,1200 / pane[0].length) - margin.left - margin.right;
var height = Math.max(350,600 / pane.length) - margin.bottom - margin.top;

var graph = {
    height: height,
    width: width*1
}

var tab = {
    height: height,
    width: width*0
}


////////////////////////////////////////////////////////////////////////////////
// highlighting methods

var leads = {}
var follows = {}

function hl_lead(d,x) {
    if (!(d[0][1]==="TBA TBA" || d[0][1]==="unknown unknown"))
        leads[d[0][1]] += x;
}
function hl_follow(d,x) {
    if (!(d[0][2]==="TBA TBA" || d[0][2]==="unknown unknown"))
        leads[d[0][2]] += x;
}

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
    hl_lead(d,1);
    hl_follow(d,1);
}

function hl_unbump(d) {
    hl_lead(d,-1);
    hl_follow(d,-1);
    hl_clean(d);
}

function hl_toggle(d) {
    hl_populate(d);
    if (leads[d[0][1]] > 1 && follows[d[0][2]] > 1) {
        hl_lead(d,-4);
        hl_follow(d,-4);
    }
    if (leads[d[0][1]]<2)
        hl_lead(d,2);
    if (follows[d[0][2]]<2)
        hl_follow(d,2);
    hl_clean(d);
}

function is_hl(d) {
    return (leads[d[0][1]] > 0 || follows[d[0][2]] > 0);
}
function is_hover(d) {
    return ((leads[d[0][1]]%2) == 1 || (follows[d[0][2]]%2) == 1);
}
////////////////////////////////////////////////////////////////////////////////

// from http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
var front = function(sel) {
    return sel.each(function(){
        this.parentNode.appendChild(this);
    });
};
    
var tip = d3.select("body").append("div")
    .attr("class","tooltip")
    .text("(competitor)");
pane.forEach(function(d,ii) {
    var tr = d3.select("table").append("tr");
    d.forEach(function(e,jj){
        make_pane(ii,jj,tr);
    })
});

function make_pane(py,px,tr) {
    
    pane[py][px] = tr.append("td");
    console.log(pane[py][px]);
    
    pane[py][px].html("<form><select id = \"comp\" name=\"comp\"></select><select id = \"round\" name=\"round\"></select></form>");
    
    var vis = pane[py][px].append("div").append("svg").attr({
            width: width + margin.left + margin.right,
            height: height + margin.top + margin.bottom,
            //transform: "translate(" + margin.left + "," + margin.top + ")"
        });
    
    svg[py][px] = vis.append("svg").attr({
            width: graph.width + margin.left,
            height: graph.height + margin.top + margin.bottom
        }).append("g").attr({
            transform: "translate(" + margin.left + "," + margin.top + ")"
        });
    
    // set up competition selector
    d3.json("comps.json",function(error,comp_data) {
        
        var DATE_FORMAT = d3.time.format("%b %Y");
        var sel = pane[py][px].select("select#comp");
        console.log(pane[py][px]);
        for (id in comp_data) {
            time = Date.parse(comp_data[id][1]);
            sel.append("option")
                .attr({
                    value:id,
                })
                .html(DATE_FORMAT(new Date(time))+": "+comp_data[id][0])
                .datum(time);
        }
        pane[py][px].selectAll("select#comp>option").sort(function(a,b){return -d3.ascending(a,b)});
        pane[py][px].select("select#comp")
            //.html(sel_html)
            .on("change",function() {
                load_comp(this.options[this.selectedIndex].value);
            });
    });
    
    load_comp("scc14");
    
    data = [];
    function load_comp(comp) {
        d3.json("data/"+comp+"/res_data.json", function(error,data){
            //var sel_html = ''
            var sel = pane[py][px].select("select#round")
            data.forEach(function(heat,ii) {
                if (heat[0][".name"][1] !== "-" && ii>0) {
                    sel.append("option")
                        .attr({
                            value:ii.toString()
                        })
                        .html(heat[0][".name"])
                        .datum(heat[0][".name"]);
                    //sel_html += ("<option value="+ii.toString()+">"+heat[0][".name"]+"</option>");
                }
            });
            pane[py][px].selectAll("select#round>option").sort(function(a,b){return d3.ascending(a,b)});
            pane[py][px].select("select#round")
                //.html(sel_html)
                .on("change",function() {
                    draw_rnd(data,this.options[this.selectedIndex].value);
                });
            
            
            draw_rnd(data,0);
        });
    }
    
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
        svg[py][px].selectAll("*").remove();
        
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
        
        function set_hl() {
            var hl_mode = false;
            d3.selectAll("path")
                .each(function(d){
                    if (is_hover(d))
                        front(d3.select(this));
                    d3.select(this).style("stroke-width",function(d) {return is_hover(d) ? Math.max(MIN_TEXT+TEXT_MARGIN*2,d3.select(this).attr("d_width")) : d3.select(this).attr("d_width")});
                    d3.select(this).style("opacity",function(d){return is_hl(d) ? 1 : 0.4});
                });
            d3.selectAll("circle")
                .attr("r",function(d){
                    if (is_hl(d)) {
                        hl_mode = true;
                        front(d3.select(this));
                    }
                    if (is_hover(d))
                        return Math.max(MIN_TEXT/2+TEXT_MARGIN,d3.select(this).attr("d_r"));
                    else
                        return d3.select(this).attr("d_r");
                });
            
            if (!hl_mode) {
                svg[py][px].selectAll("path").style({
                    "stroke-width":d3.select(this).attr("d_width"),
                    "opacity":1
                });
                svg[py][px].selectAll("circle").attr("r",d3.select(this).attr("d_r"));
            }
        }
        
        var color = [d3.scale.linear().domain([0,1]).range(["white","white"])];
        for (var ii=1; ii<=n_heats; ii+=1) {
            color[ii] = d3.scale.linear()
                .domain([0,rnd[0][".judges"][ii][1],rnd[0][".judges"][ii][0]])
                .range(["red","lightgrey","green"]);
        }
        
        var dots = svg[py][px].selectAll("circle")
            .data(rnd[1])
            
        .enter().append("circle")
            .attr({
                class:"dot",
                r:circle_radius,
                d_r:circle_radius
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
                    svg[py][px].append("path")
                        .datum(d)
                        .attr({
                            class:"path",
                            d_width:bar_width
                        })
                        .attr("d","M"+xx(jj).toString()+" "+yy(ii).toString()+"L"+xx(Math.max(jj-1,result(d,rnd))).toString()+" "+yy(ii).toString())
                        .attr("y",yy(ii))
                        .style({
                            stroke:color[jj](marks(d,jj)),
                            "stroke-width":bar_width
                        });
                }
            })
        
        for (var ii=1; ii<=n_heats; ii+=1) {
            svg[py][px].append("text")
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
        
        svg[py][px].selectAll("path,circle")
            .on("mouseover", function(d){
                var bar = d3.select(this)
                tip.html(d[0][0]+"<br/>"+d[0][1]+"<br/>"+d[0][2])
                    .style("opacity", 0.9);
                
                svg[py][px].selectAll("text.note")
                    .attr("y",bar.attr("y"))
                    .text(function(e){return marks(d,d3.select(this).attr("heat_id"))+"/"+d3.select(this).attr("j_base")})
                    .style("opacity", function(e) {
                        if (d3.select(this).attr("heat_id") >= lh(d))
                            return 0.9;
                        else
                            return 0;
                    });
                
                
                hl_bump(d);
                set_hl();
                front(svg[py][px].selectAll("text.note"));
            })
            .on("mousemove", function(){
                tip.style("top", (event.pageY-10)+"px")
                    .style("left",(event.pageX+10)+"px");
            })
            .on("mouseout", function(d){
                tip.style("opacity", 0);
                pane[py][px].selectAll("text.note")
                    .style("opacity", 0);
                
                hl_unbump(d);
                set_hl();
            })
            .on("click", function(d) {
                hl_toggle(d);
                set_hl();
                front(svg[py][px].selectAll("text.note"));
            });
        
        svg[py][px].append("text")
            .attr({
                x:graph.width-(50/pane[0].length),
                y:graph.height-(100/pane.length),
                fill:"black",
                "font-size":(35/pane[0].length).toString()+"px",
                "text-anchor":"end"
            })
            .text(rnd[0][".name"])
    }

}