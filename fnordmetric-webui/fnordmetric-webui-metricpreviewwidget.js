/**
 * This file is part of the "FnordMetric" project
 *   Copyright (c) 2014 Laura Schlimmer
 *   Copyright (c) 2014 Paul Asmuth, Google Inc.
 *
 * FnordMetric is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License v3.0. You should have received a
 * copy of the GNU General Public License along with this program. If not, see
 * <http://www.gnu.org/licenses/>.
 */
if (FnordMetric === undefined) {
  FnordMetric = {};
}

if (FnordMetric.views === undefined) {
  FnordMetric.views = {};
}

FnordMetric.util.MetricPreviewWidget = function(viewport, metric) {
  var elem = viewport;
  var metric = metric;
  var table_container = document.createElement("div");
  var chart_container = document.createElement("div");

  var inputs = {
    "show" : "Value",
    "aggregation" : {
      "time" : null,
      "step" : null
      },
    "time" : {
      "mseconds_to_end" : null,
      "end" : null
    },
    "group_by" : [],
    "columns" : null
  }

  var elems = {};

  function renderChart(chart) {
    if (chart != undefined) {
      chart_container.innerHTML = "";
      chart_container.className = "single_metric_ui chart_container";
      chart_container.innerHTML = chart.svg;
      elem.appendChild(chart_container);
      FnordMetric.extendCharts();
    }
  }

  function renderTable(table) {
    table_container.innerHTML = "";
    var table_view = FnordMetric.util.TableView(
      table.columns, table_container, 25);
    elem.appendChild(table_container);
    for (i in table.rows) {
      table_view.addRow(table.rows[i]);
    }
    table_view.render();

  }

  function runQuery(querystr) {
    FnordMetric.httpPost("/query", querystr, function(r) {
      if (r.status == 200) {
        var json = JSON.parse(r.response);
        console.log(json);
        if (json.charts != undefined) {
          renderChart(json.charts[0]);
        }
        if (json.tables != undefined) {
          renderTable(json.tables[0]);
        }
      }
    });
  }

  function setInitialInputs(aggr_time, columns, timespan, end_time) {
    inputs.aggregation.time = 
      FnordMetric.util.toMilliSeconds(aggr_time);
    inputs.aggregation.step = aggr_time;
    inputs.time.mseconds_to_end = timespan;
    inputs.columns = columns;
    inputs.time.end = end_time;
  }


  function handleAggrAvailability(show, tw_select, step_select, group_btns) {
    /* show = "value" */
    if (show == "Value" || show == "Rollup") {
      tw_select.className = "disabled";
      tw_select.disabled = true;
      step_select.className = "disabled";
      step_select.disabled = true;
      if (show == "Value") {
        group_btns.map(function(btn) {
          btn.className = "disabled";
        });
      } else {
        group_btns.map(function(btn) {
          btn.className = "";
        });
      }
    } else {
      tw_select.className = "";
      tw_select.disabled = false;
      step_select.className = "";
      step_select.disabled = false;
      group_btns.map(function(btn) {
        btn.className = "";
      });
    }

  }

  function updateDateTimeElems(start, end, title, input) {
    var end_string = FnordMetric.util.getDateTimeString(end);

    if (input != null) {
      input.value = end_string;
      input.setAttribute("id", end);
    }

    title.innerHTML = 
      FnordMetric.util.getDateTimeString(start) +
      " &mdash; " + end_string;

  }

  function onDateSubmit(ts) {
    inputs.time.end = ts;
    runQuery(FnordMetric.util.createQuery(inputs, metric));
    var start = ts - inputs.time.mseconds_to_end;
    updateDateTimeElems(start, ts, elems.timespan.title, null);
  }


  function updateEventHandler() {
    var columns = inputs.columns;
    elems.rollup.addEventListener('change', function() {
      inputs.show = this.value;
      handleAggrAvailability(
        this.value, elems.aggregation.timewindow, elems.aggregation.step, elems.group_by);
      runQuery(FnordMetric.util.createQuery(inputs, metric));
    }, false);

    elems.aggregation.timewindow.addEventListener('change', function() {
      inputs.aggregation.time = FnordMetric.util.toMilliSeconds(this.value);
      runQuery(FnordMetric.util.createQuery(inputs, metric));
    }, false);

    elems.aggregation.step.addEventListener('change', function() {
      inputs.aggregation.step = FnordMetric.util.toMilliSeconds(this.value);
      runQuery(FnordMetric.util.createQuery(inputs, metric));
    }, false);

    elems.seconds.addEventListener('change', function() {
      var mseconds_to_end = 
        FnordMetric.util.toMilliSeconds(this.value);
      var start = inputs.time.end - mseconds_to_end;
      updateDateTimeElems(
        start, inputs.time.end, elems.timespan.title, null);
      inputs.time.mseconds_to_end = mseconds_to_end;
      runQuery(FnordMetric.util.createQuery(inputs, metric));
    }, false);

    if (elems.group_by) {
      elems.group_by.map(function(column) {
        column.addEventListener('click', function(e) {
          e.preventDefault();
          var c = this.innerText;
          var index = inputs.group_by.indexOf(c);
          if (index == -1) {
            this.className = "selected";
            inputs.group_by.push(this.innerText);
          } else {
            this.className = "";
            inputs.group_by.splice(index, 1);
          }
          runQuery(FnordMetric.util.createQuery(inputs, metric));
        });
      }, false);
    }

    elems.timespan.next.addEventListener('click', function(e) {
      e.preventDefault();
      var end_time = 
        parseInt(inputs.time.end, 10) + parseInt(inputs.time.mseconds_to_end, 10);
      updateDateTimeElems(
        inputs.time.end, end_time, elems.timespan.title, elems.date);
      inputs.time.end = end_time;
      runQuery(FnordMetric.util.createQuery(inputs, metric));

      //update elems.timespan.title

    }, false);

    elems.timespan.prev.addEventListener('click', function(e) {
      e.preventDefault();
      var end_time = 
        inputs.time.end - inputs.time.mseconds_to_end;
      updateDateTimeElems(
        end_time, inputs.time.end, elems.timespan.title, elems.date);
      inputs.time.end = end_time;
      runQuery(FnordMetric.util.createQuery(inputs, metric));
      //update elems.timespan.title
    }, false);

  }


  function initElems(columns) {
    var now = Date.now();
    var initial_timespan;

    var controls = document.createElement("div");
    controls.className = "metric_preview_controls";
    elem.appendChild(controls);

    var rollup_group = document.createElement("div");
    rollup_group.className = "group aggregation_type";
    rollup_group.innerHTML = "<b>Rollup</b>"
    controls.appendChild(rollup_group);

    var rollup_select = document.createElement("select");
    rollup_group.appendChild(rollup_select);
    var rollup_options = ["Value", "Mean", "Count", "Sum", "Rollup"];
    rollup_options.map(function(rollup) {
      var option = document.createElement("option");
      option.innerHTML = rollup;
      rollup_select.appendChild(option);
    });
    elems.rollup = rollup_select;

    var aggregate_options = [
        "1s",
        "5s",
        "10s",
        "20s",
        "30s",
        "1m",
        "5m",
        "15m",
        "30m",
        "1h",
        "2h",
        "6h",
        "12h",
        "24h"];

    var aggr_group = document.createElement("div");
    aggr_group.className = "group aggregation_time_window";
    aggr_group.innerHTML = "<b>Time Window / Step<b>";
    controls.appendChild(aggr_group);

    var aggr_win = document.createElement("select");
    aggr_group.appendChild(aggr_win);
    aggregate_options.map(function(opt) {
      var option = document.createElement("option");
      option.innerHTML = opt;
      aggr_win.appendChild(option);
    });

    var aggr_step = document.createElement("select");
    aggr_group.appendChild(aggr_step);
    aggregate_options.map(function(opt) {
      var option = document.createElement("option");
      option.innerHTML = opt;
      aggr_step.appendChild(option);
    });

    elems.aggregation = {
      "timewindow" : aggr_win,
      "step": aggr_step
    };

    var date_group = document.createElement("div");
    date_group.innerHTML = "<b>End Time<b>"
    date_group.className = "group date";
    controls.appendChild(date_group);

    var datepicker = document.createElement("input");
    date_group.appendChild(datepicker);
    datepicker.setAttribute("id", now);
    FnordMetric.util.DatePicker(date_group, datepicker, elem, onDateSubmit);
    datepicker.value = FnordMetric.util.getDateTimeString(now);
    elems.date = datepicker;

    var timespan_group = document.createElement("div");
    timespan_group.className = "group timespan";
    controls.appendChild(timespan_group);

    var timespan_ttl = document.createElement("b");
    timespan_ttl.innerHTML = "Show the last...";
    var timespan_select = document.createElement("select");
    var timespans = [
        "5 minutes",
        "15 minutes",
        "30 minutes",
        "1 hour"];

    timespans.map(function(timespan) {
      var option = document.createElement("option");
      option.innerHTML = timespan;
      timespan_select.appendChild(option);
    });

    initial_timespan = FnordMetric.util.toMilliSeconds(
      timespans[0]);

    elems.seconds = timespan_select;
    timespan_group.appendChild(timespan_ttl);
    timespan_group.appendChild(timespan_select);
    controls.appendChild(timespan_group);

    var groupby_group = document.createElement("div");
    groupby_group.className = "group groupby";
    groupby_group.innerHTML = "<b>Group By</b>";
    controls.appendChild(groupby_group);

    if (columns.length > 0) {
      var group_buttons = [];
      columns.map(function(column) {
        var btn = FnordMetric.createButton(
          "#", undefined, "<i class='fa fa-toggle-off'></i>" + column);
        group_buttons.push(btn);
        groupby_group.appendChild(btn);
      });
      elems.group_by = group_buttons;
    }

    var secondary_controls = document.createElement("div");
    elem.appendChild(secondary_controls);
    secondary_controls.className = "metric_preview_secondary_controls";

    var controls_query = FnordMetric.createButton(
      "#", "btn", "<i class='fa fa-database'></i> SQL Editor");
    controls_query.onclick = function(e) {
      e.preventDefault();
      var query = 
        decodeURIComponent("SELECT * FROM " + metric);
      FnordMetric.WebUI.singleton.openUrl(
        "query_playground?sql_query="+query, true);
    };

    var controls_embed = FnordMetric.createButton(
      "#", "btn", "<i class='fa fa-share'></i> Embed");
    controls_embed.onclick = function(e) {
      e.preventDefault();
      FnordMetric.util.openPopup(
        elem, "TODO add embed snippet");
    }

    secondary_controls.appendChild(controls_query);
    secondary_controls.appendChild(controls_embed);

    var timespan_updater = document.createElement("div");
    var prev_timespan = FnordMetric.createButton(
      "#", undefined, "<i class='fa fa-chevron-left'></i>");
    var next_timespan = FnordMetric.createButton(
      "#", undefined, "<i class='fa fa-chevron-right'></i>");
    var updater_ttl = document.createElement("span");
    updater_ttl.className = "current_date";
    updater_ttl.innerHTML = 
      FnordMetric.util.getDateTimeString(
        now - initial_timespan) + " &mdash; " + 
      FnordMetric.util.getDateTimeString(now);

    elems.timespan = {
      prev : prev_timespan,
      next : next_timespan,
      title: updater_ttl
    }

    secondary_controls.appendChild(timespan_updater);
    secondary_controls.appendChild(prev_timespan);
    secondary_controls.appendChild(updater_ttl);
    secondary_controls.appendChild(next_timespan);

    updateEventHandler();

    setInitialInputs(
      aggregate_options[0], columns, initial_timespan, datepicker.getAttribute("id"));


    handleAggrAvailability("Value", aggr_win, aggr_step, group_buttons);

    runQuery(FnordMetric.util.createQuery(inputs, metric));
  }

  function render() {
    var columns = [];
    FnordMetric.httpGet("/metrics", function(r) {
      if (r.status == 200) {
        var json = JSON.parse(r.response);
        json.metrics.map(function(m) {
          if (m.key != metric) {return;}
          m.labels.map(function(label) {
            columns.push(label);
          });
        });
        initElems(columns);
      }
    });

  }


  return {
    "render" : render
  }

}