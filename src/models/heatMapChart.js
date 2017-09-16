/* Heatmap Chart Type

A heatmap is a graphical representation of data where the individual values
contained in a matrix are represented as colors within cells. Furthermore,
metadata can be associated with each of the matrix rows or columns. By grouping
these rows/columns together by a given metadata value, data trends can be spotted.

Format for input data should be:
var data = [
    {day: 'mo', hour: '1a', value: 16, timeperiod: 'early morning', weekperiod: 'week', category: 1},
    {day: 'mo', hour: '2a', value: 20, timeperiod: 'early morning', weekperiod: 'week', category: 2},
    {day: 'mo', hour: '3a', value: 0, timeperiod: 'early morning', weekperiod: 'week', category: 1},
    ...
]
where the keys 'day' and 'hour' specify the row/column of the heatmap, 'value' specifies the  cell
value and the keys 'timeperiod', 'weekperiod' and 'week' are extra metadata that can be associated
with rows/columns.


Options for chart:
*/
nv.models.heatMapChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var heatMap = nv.models.heatMap()
        , legend = nv.models.legend()
        , legendRowMeta = nv.models.legend()
        , legendColumnMeta = nv.models.legend()
        , tooltip = nv.models.tooltip()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        ;


    var margin = {top: 20, right: 10, bottom: 50, left: 60}
        , marginTop = null
        , width = null
        , height = null
        , color = nv.utils.getColor()
        , showLegend = true
        , staggerLabels = false
        , showXAxis = true
        , showYAxis = true
        , alignYAxis = 'left'
        , alignXAxis = 'top'
        , rotateLabels = 0
        , title = false
        , x
        , y
        , noData = null
        , dispatch = d3.dispatch('beforeUpdate','renderEnd')
        //, dispatch = d3.dispatch('beforeUpdate', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        , duration = 250
        ;

    xAxis
        .orient(alignXAxis)
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;
    yAxis
        .orient(alignYAxis)
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;

    tooltip
        .duration(0)
        .headerEnabled(false)
        .valueFormatter(function(d, i) {
            return d;
            return d.toFixed(2);
        })
        .keyFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        });


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    // https://bl.ocks.org/mbostock/4573883
    // get max/min range for all the quantized cell values
    // returns an array where each element is [start,stop]
    // of color bin
    function quantizeLegendValues() {

        var e = heatMap.colorScale();

        return e.range().map(function(color) {
          var d = e.invertExtent(color);
          if (d[0] == null) d[0] = e.domain()[0];
          if (d[1] == null) d[1] = e.domain()[1];
          return d;
        })

    }

    // return true if row metadata specified by user
    function hasRowMeta() {
        return typeof heatMap.yMeta === 'function'
    }
    // return true if col metadata specified by user
    function hasColumnMeta() {
        return typeof heatMap.xMeta === 'function'
    }

    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(heatMap);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() {
                dispatch.beforeUpdate();
                container.transition().duration(duration).call(chart);
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup Scales
            x = heatMap.xScale();
            y = heatMap.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap').append('g');
            var g = wrap.select('g');


            gEnter.append('g').attr('class', 'nv-heatMap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis')

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


            heatMap
                .width(availableWidth)
                .height(availableHeight);


            var heatMapWrap = g.select('.nv-heatMap')
                .datum(data.filter(function(d) { return !d.disabled }));


            heatMapWrap.transition().call(heatMap);


            if (heatMap.cellAspectRatio()) {
                availableHeight = heatMap.cellHeight() * y.domain().length;
                heatMap.height(availableHeight);
            }


            // Setup Axes
            if (showXAxis) {

                xAxis
                    .scale(x)
                    ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis').call(xAxis);

                var xTicks = g.select('.nv-x.nv-axis').selectAll('g');

                xTicks
                    .selectAll('.tick text')
                    .attr('transform', function(d,i,j) {
                        var rot = rotateLabels != 0 ? rotateLabels : '0';
                        var stagger = staggerLabels ? j % 2 == 0 ? '5' : '17' : '0';
                        return 'translate(0, ' + stagger + ') rotate(' + rot + ' 0,0)';
                    })
                    .style('text-anchor', rotateLabels > 0 ? 'start' : rotateLabels < 0 ? 'end' : 'middle');

                // adjust position of axis based on presence of metadata group
                if (alignXAxis == 'bottom') {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (availableHeight + (hasColumnMeta() ? heatMap.cellWidth()/2 : 0)) + ")");
                } else {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (hasColumnMeta() ? -heatMap.cellWidth()/2 : 0) + ")");
                }
            }

            if (showYAxis) {


                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(availableHeight/36, data) )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis').call(yAxis);

                // adjust position of axis based on presence of metadata group
                if (alignYAxis == 'right') {
                    g.select(".nv-y.nv-axis")
                        .attr("transform", "translate(" + (availableWidth + (hasRowMeta() ? heatMap.cellHeight()/2: 0)) + ",0)");
                } else {
                    g.select(".nv-y.nv-axis")
                        .attr("transform", "translate(" + (hasRowMeta() ? -heatMap.cellHeight()/2 : 0) + ",0)");
                }
            }


            // Legend
            if (!showLegend) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                legend
                    .width(availableWidth)
                    .color(heatMap.colorScale().range())

                 var legendVal = quantizeLegendValues().map(function(d) {
                    return {key: d[0].toFixed(1) + " - " + d[1].toFixed(1)};
                 })

                g.select('.nv-legendWrap')
                    .datum(legendVal)
                    .call(legend);

                // position legend opposite of X-axis
                g.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (alignXAxis == 'top' ? availableHeight : -30) + ')'); // TODO: more intelligent offset (-30) when top aligning legend
            }


        });

        // axis don't have a flag for disabling the zero line, so we do it manually
        d3.selectAll('.nv-axis').selectAll('line')
            .style('stroke-opacity', 0)
        d3.select('.nv-y').select('path.domain').remove()

        renderWatch.renderEnd('heatMap chart immediate');

        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    heatMap.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt['series'] = {
            key: chart.x()(evt.data) + ' ' + chart.y()(evt.data),
            value: !chart.normalize() ? chart.cellValue()(evt.data) : chart.cellValueNorm()(evt.data),
            color: evt.color
        };
        tooltip.data(evt).hidden(false);
    });

    heatMap.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true);
    });

    heatMap.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip();
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.heatMap = heatMap;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        noData:     {get: function(){return noData;}, set: function(_){noData=_;}},
        showXAxis:     {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis:     {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        rotateLabels:  {get: function(){return rotateLabels;}, set: function(_){rotateLabels=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            if (_.top !== undefined) {
                margin.top = _.top;
                marginTop = _.top;
            }
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            heatMap.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        alignYAxis: {get: function(){return alignYAxis;}, set: function(_){
            alignYAxis = _;
            yAxis.orient(_);
        }},
        alignXAxis: {get: function(){return alignXAxis;}, set: function(_){
            alignXAxis = _;
            xAxis.orient(_);
        }},
    });

    nv.utils.inheritOptions(chart, heatMap);
    nv.utils.initOptions(chart);

    return chart;
}
