/*global _, _s*/
define(function(require) {
  var Super = require('views/page'),
    B = require('bluebird'),
    MAIN = require('hbs!./index.tpl'),
    Backbone = require('backbone'),
    SiteEdit = require('./index/site-edit'),
    SiteWidget = require('./index/site-widget'),
    TypeWidget = require('./index/type-widget'),
    ExecutionStatus = require('models/execution-status'),
    Dialog = require('views/controls/dialog'),
    Sites = require('collections/site'),
    Modules = require('collections/module'),
    Types = require('collections/type'),
    Site = require('models/site');

  var Page = Super.extend({});

  Page.prototype.initialize = function(options) {
    var that = this;
    //super(options)
    Super.prototype.initialize.call(that, options);

    that.sites = new Sites();
    that.types = new Types(window.config.types);
    that.modules = new Modules();
  };

  Page.prototype.render = function() {
    var that = this;

    that.$el.html(MAIN({
      id: that.id
    }));
    that.mapControls();

    var events = {};
    events['keyup ' + that.toId('query')] = 'onQueryKeyup';
    events['click ' + that.toId('new')] = 'onNewClick';
    events['click ' + that.toId('run-all')] = 'onRunAllClick';
    events['click ' + that.toId('stop')] = 'onStopClick';
    events['click ' + '.types .btn'] = 'onTypesClick';

    that.delegateEvents(events);

    that.sites.on('sync add', that.renderSites.bind(that));
    that.sites.on('remove', that.onSiteRemove.bind(that));
    that.sites.on('change', that.onSiteChange.bind(that));

    that.on('search', that.performSearch.bind(that));

    //keep updating airlines
    return that.fetch()
      .then(function() {
        that.children.types = new TypeWidget({
          el: that.$el.find('.types'),
          types: that.types
        });
        that.children.types.render();
        that.children.types.on('change', that.onTypesChange.bind(that));
        return Super.prototype.render.call(that);
      });
  };

  Page.prototype.onTypesChange = function(event) {
    this.trigger('search');
  };

  Page.prototype.onSiteChange = function() {
    this.updateUI();
  };
  Page.prototype.updateUI = function() {
    var that = this;
    if (that.sites.every(function(site) {
        if (_.contains([ExecutionStatus.ID_RUNNING, ExecutionStatus.ID_SCHEDULED], site.get('status'))) {
          return false;
        }
        return true;
      })) {
      that.controls.runAll.prop('disabled', false);
    }
  };

  Page.prototype.onSiteRemove = function(removedSite) {
    //TODO: why the heck I'm not getting this event
    removedSite.view.remove();
  };

  Page.prototype.addSiteToCollection = function(site) {
    this.sites.add(site);
  }

  Page.prototype.renderSites = function() {
    var that = this;


    B.all(_.map(that.sites.filter(function(site) {
      return !site.isRendered;
    }), function(site) {
      site.view = new SiteWidget({
        model: site,
        types: that.types
      });
      site.isRendered = true;

      site.view.on('cloned', function(clonedModel) {
        that.addSiteToCollection(clonedModel);
      });

      return site.view.render()
        .then(function() {
          that.controls.sites.append(site.view.$el);
          site.view.on('schedule', that.onSiteScheduled.bind(that));
        });
    }));

    that.updateUI();
  };

  Page.prototype.onSiteScheduled = function() {
    var that = this;
    that.toast.success('Job has been scheduled to start in 10 seconds.');
  };

  Page.prototype.onRunAllCompleted = function() {
    this.controls.runAll.removeClass('hidden');
    this.controls.new.removeClass('hidden');
    this.controls.stop.addClass('hidden');
  };

  Page.prototype.onRunAllTerminated = function() {
    this.controls.runAll.removeClass('hidden');
    this.controls.new.removeClass('hidden');
    this.controls.stop.addClass('hidden');
  };

  Page.prototype.onRunAllStarted = function() {
    this.controls.runAll.addClass('hidden');
    this.controls.new.addClass('hidden');
    this.controls.stop.removeClass('hidden');
  };

  Page.prototype.onStopClick = function(event) {
    var that = this;
    that.runAllStopRequested = true;
  };

  Page.prototype.onQueryKeyup = _.debounce(function(event) {
    this.trigger('search');
  }, 300);

  Page.prototype.performSearch = function() {
    var that = this;
    var query = that.controls.query.val().trim();
    var visibleSites = that.sites.models;

    if (!_.isEmpty(query)) {
      var re = new RegExp(query, 'i');
      visibleSites = _.filter(visibleSites, function(site) {
        return re.test(site.get('tags') + ',' + site.get('name'));
      });
    }

    var selectedTypes = that.children.types.val();
    if (!_.isEmpty(selectedTypes)) {
      var typeIds = _.pluck(selectedTypes, 'id');

      visibleSites = _.filter(visibleSites, function(site) {
        return _.contains(typeIds, site.get('typeId'));
      });
    }

    that.sites.forEach(function(site) {
      if (site.view) {
        var visible = _.find(visibleSites, function(vs) {
          return site.id === vs.id;
        });
        site.view.$el.toggleClass('hidden', !visible);
      }
    });
  };


  Page.prototype.onRunAllClick = function(event) {
    var that = this;
    that.controls.runAll.prop('disabled', true);
    B.all(_.map(that.sites.filter(function(site) {
      return site.view && !site.view.$el.hasClass('hidden');
    }), function(site) {
      return site.run();
    }))
      .then(function() {
        that.toast.success('All matched sites have been scheduled to run.');
      });
  };

  Page.prototype.run = function() {
    var that = this;
    var runningAirline = that.airlineCollection.at(that.runningAirlineIndex);

    that.listenToOnce(runningAirline.view, 'completed', function() {
      that.runningAirlineIndex++;
      if (that.runAllStopRequested) {
        that.runAllStopRequested = false;
        that.trigger('run-all-terminated');
      }
      else{
        if (that.runningAirlineIndex < that.airlineCollection.length) {
          that.run();
        }
        else{
          that.trigger('run-all-completed');
        }
      }
    });

    runningAirline.view.run();
  };

  Page.prototype.openSiteDialog = function(model, types) {
    var that = this,
      isNew = model.isNew();

    var view = new SiteEdit({
      model: model,
      types: types
    });

    var dlg = new Dialog({
      title: isNew ? 'New Site' : 'Edit: ' + model.get('name'),
      body: view,
      buttons: [{
        id: 'save',
        label: 'Save',
        iconClass: 'fa fa-save',
        buttonClass: 'btn-primary',
        align: 'left'
      }, {
        id: 'cancel',
        label: 'Cancel',
        iconClass: 'fa fa-times',
        buttonClass: 'btn-default',
        align: 'left',
        autoClose: true
      }]
    })

    dlg.on('save', function() {
      B.resolve(model.save(view.val()))
        .then(function() {
          if (isNew) {
            that.sites.add(model);
          }
          that.toast.success('New site has been added.');
          dlg.close();
        });
    });
  };

  Page.prototype.onNewClick = function(event) {
    event.preventDefault();
    var that = this;
    var model = new Site({
      name: 'New Site'
    });

    that.openSiteDialog(model, that.types);
  };


  Page.prototype.refresh = function() {
    var that = this;
    //clean up
    that.airlineCollection.forEach(function(airline) {
      if (airline.view) {
        airline.view.remove();
      }
    });

    return that.fetch()
      .then(function() {
        that.renderAirlines();
      });
  };

  Page.prototype.onAirlineCreated = function(airline) {
    this.refresh();
    this.toast.success("Airline has been created!");
  };

  Page.prototype.onAirlineSaved = function(airline) {
    this.refresh();
    this.toast.success("Airline has been saved!");
  };

  Page.prototype.onAirlineDeleted = function(airline) {
    this.airlineCollection.remove(airline);
    this.refresh();
    this.toast.success("Airline has been deleted!");
  };

  Page.prototype.onAirlineCloned = function(airline) {
    this.refresh();
    this.toast.success("Airline has been cloned!");
  };


  Page.prototype.fetch = function() {
    var that = this;
    return B.all([that.sites.fetch()]);
  };


  return Page;


});