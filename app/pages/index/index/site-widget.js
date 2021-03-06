/*global _, _s, ace*/
define(function(require) {
  var Super = require('views/base'),
    B = require('bluebird'),
    EditView = require('./site-edit'),
    ModulesView = require('./modules'),
    Dialog = require('views/controls/dialog'),
    ansi = require('ansi'),
    ExecutionStatus = require('models/execution-status'),
    TEMPLATE = require('hbs!./site-widget.tpl'),
    MODULE_LIST = require('hbs!./module-list.tpl');

  var View = Super.extend({
    className: 'col-xm-12 col-sm-6 col-md-4 col-lg-3'
  });


  View.prototype.initialize = function(options) {
    Super.prototype.initialize.call(this, options);
    this.types = options.types;
  };

  View.prototype.render = function() {
    var that = this;

    that.$el.html(TEMPLATE({
      id: that.id
    }));

    that.mapControls();

    var events = {};
    events['click ' + that.toId('header')] = 'onHeaderClick';
    events['click ' + that.toId('edit')] = 'onEditClick';
    events['click ' + that.toId('show-modules')] = 'onModulesClick';
    events['click ' + that.toClass('module')] = 'onModuleClick';
    events['click ' + that.toId('run')] = 'onRunClick';
    events['click ' + that.toId('stop')] = 'onStopClick';

    that.delegateEvents(events);

    that.model.on('sync change', that.draw.bind(that));
    that.model.on('destroy', that.remove.bind(that));
    that.draw();

    return B.resolve();
  };

  View.prototype.remove = function() {
    //stop the status querying process
    return Super.prototype.remove.apply(this, arguments);
  }


  View.prototype.draw = function() {
    var that = this;

    that.controls.name.text(that.model.get('name'));

    if (!_.isEmpty(that.model.get('modules')) && _.contains([
        ExecutionStatus.ID_OK,
        ExecutionStatus.ID_NOT_STARTED,
        ExecutionStatus.ID_TERMINATED,
        ExecutionStatus.ID_ERROR
      ], that.model.get('status'))) {
      that.controls.run.removeClass('hidden');
    }
    else{
      that.controls.run.addClass('hidden');
    }
    if (!_.isEmpty(that.model.get('modules')) && _.contains([
        ExecutionStatus.ID_RUNNING,
        ExecutionStatus.ID_SCHEDULED
      ], that.model.get('status'))) {
      that.controls.stop.removeClass('hidden');
    }
    else{
      that.controls.stop.addClass('hidden');
    }

    var iconClass = 'fa-square-o',
      panelClass = 'panel-default';
    switch (that.model.get('status')) {

      case ExecutionStatus.ID_SCHEDULED:
        iconClass = 'fa-clock-o text-info';
        panelClass = 'panel-info';
        break;

      case ExecutionStatus.ID_ERROR:
        iconClass = 'fa-exclamation-circle text-danger';
        panelClass = 'panel-danger';
        break;

      case ExecutionStatus.ID_RUNNING:
        iconClass = 'fa-spinner fa-spin text-warning';
        panelClass = 'panel-warning';
        break;

      case ExecutionStatus.ID_RUNNING:
        iconClass = 'fa-check text-success';
        panelClass = 'panel-success';
        break;

      case ExecutionStatus.ID_TERMINATED:
        iconClass = 'fa-exclamation text-warning';
        panelClass = 'panel-warning';
        break;

      case ExecutionStatus.ID_OK:
        iconClass = 'fa-check-square text-success';
        panelClass = 'panel-success';
        break;
    }


    that.controls.icon.attr('class', 'fa ' + iconClass);
    that.$el.find('>.panel').removeClass('panel-default panel-danger panel-success panel-warning panel-info').addClass(panelClass);
    that.controls.modules.html(MODULE_LIST({
      id: that.id,
      modules: _.sortBy(_.map(_.filter(that.model.get('modules') || [], function(module) {
        return module.isEnabled;
      }), function(module) {
        return _.extend(module, {
          iconClass: (function() {
            switch (module.status) {
              case ExecutionStatus.ID_RUNNING:
                return 'fa-spinner fa-spin text-warning';
              case ExecutionStatus.ID_OK:
                return 'fa-check text-success';
              case ExecutionStatus.ID_ERROR:
                return 'fa-exclamation-circle text-danger';
              default:
                return 'fa-square-o';
            }
          })()
        });
      }), function(module) {
        return module.name;
      })
    }));
  };

  View.prototype.onHeaderClick = function(event) {
    event.preventDefault();
    this.$el.find('>.panel').toggleClass('expanded');
  };

  View.prototype.onModuleClick = function(event) {

    var that = this,
      e = $(event.currentTarget),
      dlg,
      modules = that.model.get('modules') || [],
      moduleIndex = e.data('index'),
      module = modules[moduleIndex];

    event.preventDefault();
    var html = '<code>' + ansi.ansi_to_html((module.logs || '')) + '</code><div class="screenshot"></div>';

    var buttons = [{
      id: 'close',
      label: 'Close',
      iconClass: 'fa fa-times',
      buttonClass: 'btn-default',
      align: 'left',
      autoClose: true
    }];
//img-responsive

    dlg = new Dialog({
      sizeClass: 'modal-lg terminal',
      body: html,
      title: 'View Log ' + module.name || '',
      buttons: buttons
    });

    dlg.on('shown', function() {
      console.log('trigger dialog shown');
      var pathToImage = '/screenshots/' + module._id + '.png';
      var imageElement = $("<img class='img-responsive center-block'/>")
        .load(function() {
          dlg.body.find('.screenshot').append(imageElement);
        })
        .error(function() {
        })
        .attr("src", pathToImage);
    });
  };

  View.prototype.onRunClick = function(event) {
    var that = this;
    event.preventDefault();
    return that.run();
  };

  View.prototype.onStopClick = function(event) {
    var that = this;
    event.preventDefault();
    return that.model.stop();
  };

  View.prototype.run = function() {
    var that = this;

    that.controls.run.addClass('hidden');
    that.controls.stop.removeClass('hidden');

    return that.model.run()
      .then(function() {
        that.trigger('schedule');
      });
  };

  View.prototype.startUpdateStatusProcess = function() {
    var that = this;
    return B.resolve(that.model.modules.fetch({
      data: {
        siteId: that.model.id
      }
    }))
      .then(function() {
        if (that.model.modules.find(function(module) {
            return module.get('status') === ExecutionStatus.ID_RUNNING
          }) !== undefined) {
          _.delay(that.startUpdateStatusProcess.bind(that), 5000);
        }
        else{
          that.trigger('completed');
        }
      });
  };


  View.prototype.onEditClick = function(event) {
    event.preventDefault();
    event.stopPropagation();
    this.showEditDialog();
  };

  View.prototype.showEditDialog = function() {
    var that = this,
      dlg,
      isNew = that.model.isNew();

    var view = new EditView({
      model: that.model,
      types: that.types
    });

    var buttons = [{
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
    }];

    if (!isNew) {
      buttons.push({
        id: 'clone',
        label: 'Clone',
        iconClass: 'fa fa-copy',
        buttonClass: 'btn-info',
        align: 'right'
      });

      buttons.push({
        id: 'delete',
        label: 'Delete',
        iconClass: 'fa fa-trash-o',
        buttonClass: 'btn-danger',
        align: 'right'
      });
    }

    dlg = new Dialog({
      sizeClass: 'modal-lg',
      body: view,
      title: 'Edit:' + that.model.get('name'),
      buttons: buttons
    });

    dlg.on('save', function(event) {
      var viewValue = view.val();
      B.resolve(that.model.save(viewValue, {
        patch: true,
        wait: true
      }))
        .then(function() {
          dlg.close();
        });
    });


    dlg.on('delete', function(event) {
      var confirmDlg = new Dialog({
        body: 'Are you sure you want to delete ' + that.model.get('name') + '?',
        buttons: [{
          id: 'delete',
          label: 'Delete',
          iconClass: 'fa fa-trash-o',
          buttonClass: 'btn-danger',
          autoClose: false
        }, {
          id: 'no',
          label: 'Nope!',
          iconClass: 'fa fa-times',
          autoClose: true
        }]
      });
      confirmDlg.on('delete', function() {
        B.resolve(that.model.destroy({
          wait: true
        }))
          .then(function() {
            _.delay(function() {
              confirmDlg.close();
              dlg.close();
              that.remove();
            }, 1000);

          });
      });
    });

    dlg.on('clone', function(event) {
      B.resolve(that.model.duplicate())
        .then(function(result) {
          that.trigger('cloned', result);
          dlg.close();
        });
    });
  };


  View.prototype.showModulesDialog = function() {
    var that = this;

    var view = new ModulesView({
      model: that.model
    });

    var buttons = [{
      id: 'done',
      label: 'Done',
      iconClass: 'fa fa-check',
      buttonClass: 'btn-primary',
      align: 'left',
      autoClose: true
    }];

    var dlg = new Dialog({
      sizeClass: 'modal-lg',
      body: view,
      title: 'Modules of ' + that.model.get('name'),
      buttons: buttons
    });

  };

  View.prototype.onModulesClick = function(event) {
    var that = this;
    event.preventDefault();
    this.showModulesDialog();
  };

  View.prototype.remove = function() {
    Super.prototype.remove.call(this);
  };


  return View;
});
