/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import AppsManager                                                   from 'lib/AppsManager';
import FlowFooter                                                    from 'components/FlowFooter/FlowFooter.react';
import history                                                       from 'dashboard/history';
import html                                                          from 'lib/htmlString';
import Icon                                                          from 'components/Icon/Icon.react';
import joinWithFinal                                                 from 'lib/joinWithFinal';
import LiveReload                                                    from 'components/LiveReload/LiveReload.react';
import prettyNumber                                                  from 'lib/prettyNumber';
import React                                                         from 'react';
import styles                                                        from 'dashboard/Apps/AppsIndex.scss';
import { center }                                                    from 'stylesheets/base.scss';
import AppBadge                                                      from 'components/AppBadge/AppBadge.react';
import { Button, Form, FormGroup, Label, Input, 
         FormText, Modal, ModalHeader, ModalBody, ModalFooter,
         TabContent, TabPane, Nav, NavItem, NavLink }                from 'reactstrap';
import ParseApp                                                      from 'lib/ParseApp';


function dash(value, content) {
  if (value === undefined) {
    return '-';
  }
  if (content === undefined) {
    return value;
  }
  return content;
}
/* eslint-disable no-unused-vars */
let CloningNote = ({ app, clone_status, clone_progress }) => {
/* eslint-enable */
  if (clone_status === 'failed') {
    //TODO: add a way to delete failed clones, like in old dash
    return <div>Clone failed</div>
  }
  let progress = <LiveReload
    initialData={[{appId: app.applicationId, progress: clone_progress}]}
    source='/apps/cloning_progress'
    render={data => {
      let currentAppProgress = data.find(({ appId }) => appId === app.applicationId);
      let progressStr = currentAppProgress ? currentAppProgress.progress.toString() : '0';
      return <span>{progressStr}</span>;
    }}/>
  return <div>Cloning is {progress}% complete</div>
};

let CountsSection = ({ className, title, children }) =>
 <div className={className}>
   <div className={styles.section}>{title}</div>
   {children}
 </div>

let Metric = (props) => {
  return (
    <div className={styles.count}>
      <div className={styles.number}>{props.number}</div>
      <div className={styles.label}>{props.label}</div>
    </div>
  );
};

let AppCard = ({
  app,
  icon,
}) => {
  let canBrowse = app.serverInfo.error ? null : () => history.push(html`/apps/${app.slug}/browser`);
  let versionMessage = app.serverInfo.error ?
    <div className={styles.serverVersion}>Server not reachable: <span className={styles.ago}>{app.serverInfo.error.toString()}</span></div>:
    <div className={styles.serverVersion}>
    Server URL: <span className={styles.ago}>{app.serverURL || 'unknown'}</span>
    Server version: <span className={styles.ago}>{app.serverInfo.parseServerVersion || 'unknown'}</span>
    </div>;

  return <li onClick={canBrowse}>
    <a className={styles.icon}>
      {icon ? <img src={'appicons/' + icon} width={56} height={56}/> : <Icon width={56} height={56} name='blank-app-outline' fill='#1E384D' />}
    </a>
    <div className={styles.details}>
      <a className={styles.appname}>{app.name}</a>
      {versionMessage}
    </div>
    <CountsSection className={styles.glance} title='At a glance'>
      <AppBadge production={app.production} />
      <Metric number={dash(app.users, prettyNumber(app.users))} label='total users' />
      <Metric number={dash(app.installations, prettyNumber(app.installations))} label='total installations' />
    </CountsSection>
  </li>
}

export default class AppsIndex extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      search: '',
      modal: true,
      appName: 'APP_NAME',
      appId: 'APP_ID',
      masterKey: 'MASTER_KEY',
      serverURL: 'http://localhost:3788/api'
    };
    this.focusField = this.focusField.bind(this);
    this.toggle = this.toggle.bind(this);
    this.addExistApp = this.addExistApp.bind(this);
    this.handleChangeInputText = this.handleChangeInputText.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
  }

  componentWillMount() {
    document.body.addEventListener('keydown', this.focusField);
    AppsManager.getAllAppsIndexStats().then(() => {
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.focusField);
  }

  updateSearch(e) {
    this.setState({ search: e.target.value });
  }

  focusField() {
    if (this.refs.search) {
      this.refs.search.focus();
    }
  }

  addExistApp() {
    this.toggle();
  }

  toggle() {
    this.setState({
      modal: !this.state.modal
    });
  }
  
  handleSaveClick() {
    var that = this;
    var app = {
      appId: this.state.appId,
      appName: this.state.appName,
      masterKey: this.state.masterKey,
      serverURL: this.state.serverURL
    }
    console.log(app);
    // AppsManager.addApp(app);
    new ParseApp(app).apiRequest(
      'GET',
      'serverInfo',
      {},
      { useMasterKey: true }
    ).then(serverInfo => {
      app.serverInfo = serverInfo;
      return app;
    }, error => {
      if (error.code === 100) {
        app.serverInfo = {
          error: 'unable to connect to server',
          enabledFeatures: {},
          parseServerVersion: "unknown"
        }
        return Parse.Promise.as(app);
      } else if (error.code === 107) {
        app.serverInfo = {
          error: 'server version too low',
          enabledFeatures: {},
          parseServerVersion: "unknown"
        }
        return Parse.Promise.as(app);
      } else {
        app.serverInfo = {
          error: error.message || 'unknown error',
          enabledFeatures: {},
          parseServerVersion: "unknown"
        }
        return Parse.Promise.as(app);
      }
    })
    .then(app => {
      AppsManager.addApp(app);
      that.forceUpdate();
      that.setState({
        modal: false,
        appName: '',
        appId: '',
        masterKey: '',
        serverURL: ''
      });
    });
  }

  handleChangeInputText(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  render() {
    let search = this.state.search.toLowerCase();
    let apps = AppsManager.apps();
    let modal = <Modal isOpen={this.state.modal} toggle={this.toggle} className="modal-lg">
            <ModalHeader toggle={this.toggle}>Add exist app</ModalHeader>
            <ModalBody>
              <Form>
                <FormGroup>
                  <Label for="serverURL">Server URL</Label>
                  <Input type="text" name="serverURL" id="serverURL" value={this.state.serverURL} onChange={this.handleChangeInputText} placeholder="Server URL, e.g: http://192.168.1.30:1337/parse-salekit" />
                </FormGroup>
                <FormGroup>
                  <Label for="appName">Application name</Label>
                  <Input type="text" name="appName" id="appName" value={this.state.appName} onChange={this.handleChangeInputText} placeholder="Input Application Name"/>
                </FormGroup>
                <FormGroup>
                  <Label for="appId">Application ID</Label>
                  <Input type="text" name="appId" id="appId" value={this.state.appId} onChange={this.handleChangeInputText} placeholder="Input Application ID" />
                </FormGroup>
                <FormGroup>
                  <Label for="masterKey">Master Key</Label>
                  <Input type="text" name="masterKey" id="masterKey" value={this.state.masterKey} onChange={this.handleChangeInputText} placeholder="Input Master Key" />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggle}>Cancel</Button>{' '}
              <Button color="primary" onClick={this.handleSaveClick}>Save</Button>
            </ModalFooter>
          </Modal>
    if (apps.length === 0) {
      return (
        <div className={styles.empty}>
          <div className={center}>
            <div className={styles.cloud}>
              <Icon width={110} height={110} name='cloud-surprise' fill='#1e3b4d' />
            </div>
            <div className={styles.alert}>You don't have any apps</div>
            <Button color="primary" onClick={this.addExistApp}>Add exist app!</Button>
          </div>
          {modal}
        </div>
      );
    }
    let upgradePrompt = null;
    if (this.props.newFeaturesInLatestVersion.length > 0) {
      let newFeaturesNodes = this.props.newFeaturesInLatestVersion.map(feature => <strong>
        {feature}
      </strong>);
      upgradePrompt = <FlowFooter>
        Upgrade to the <a href='https://www.npmjs.com/package/parse-dashboard' target='_blank'>latest version</a> of Parse Dashboard to get access to: {joinWithFinal('', newFeaturesNodes, ', ', ' and ')}.
      </FlowFooter>
    }

    return (
      <div className={styles.index}>
        <Button color="primary" onClick={this.addExistApp}>Add exist app!</Button>
        <div className={styles.header}>
          <Icon width={18} height={18} name='search-outline' fill='#788c97' />
          <input
            ref='search'
            className={styles.search}
            onChange={this.updateSearch.bind(this)}
            value={this.state.search}
            placeholder='Start typing to filter&hellip;' />
        </div>
        <ul className={styles.apps}>
          {apps.map(app =>
            app.name.toLowerCase().indexOf(search) > -1 ?
              <AppCard key={app.slug} app={app} icon={app.icon ? app.icon : null}/> :
              null
          )}
        </ul>
        {upgradePrompt}
        {modal}
      </div>
    );
  }
}
