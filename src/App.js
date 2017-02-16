import './App.css';
import _ from 'lodash';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import layer from 'layer-websdk';
import layerUI from 'layer-ui-web';
import logo from './logo.svg';
import db from './db';

function getIdentityToken(nonce) {
  const endpoint = 'https://api-stage.trustcircleglobal.com/v1/chat?access_token=9675817586b3480eb76f7b752eb65b0f';
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce }),
  });
}

// Init Layer
const appId = 'layer:///apps/staging/8dcc11be-0d05-11e5-9651-9fa92d003905';
const userId = '4743073850458112';
const client = window.client = new layer.Client({
  appId,
  userId,
  isTrustedDevice: true,
});

client.on('challenge', (evt) => {
  getIdentityToken(evt.nonce)
    .then(response => {
      response.json().then(({ data }) => {
        evt.callback(data.identity_token);
      })
    })
    .catch(error => {
      console.log(error);
    });
});

client.on('ready', (client) => {
  console.log(client);
});

client.connect(userId);

// Register new template
layerUI.registerComponent('layer-avatar', {
  properties: {
    users: {
      set: function(value) {
        if (!value) value = [];
        if (!Array.isArray(value)) value = [value];
        // classList.toggle doesn't work right in IE 11
        this.classList[value.length ? 'add' : 'remove']('layer-has-user');
        this.render();
      }
    }
  },
  methods: {
    render: function() {
      const usersDB = db.users;
      const user = _(this.properties.users)
        .filter((user, userId) => userId !== client.userId)
        .value();

      if (_.size(user)) {
        usersDB.get(user[0].userId)
          .then(data => {
            const imageUrl = _.includes(data.image_url, 'tcg_avatar.png')
              ? data.image_url
              : `${data.image_url}=s50-c`;
            this.innerHTML = `<span><img src="${imageUrl}" alt="${data.name}" /></span>`;
          });
      } else {
        console.log(this);
        this.innerHTML = `<span><img src="${logo}" alt="TKN" /></span>`;
      }
    }
  }
});

// init LayerWebUI
layerUI.init({
  appId,
  client,
  layer: window.layer,
});

const {
  ConversationPanel,
  ConversationsList,
  IdentitiesList,
  Notifier,
} = layerUI.adapters.react(React, ReactDOM);

class App extends Component {

  state = {
    selectedIdentities: [],
    selectedConversationId: '',
  }

  handleOnIdentitySelected = (event) => {
    // console.log(event);
  }

  handleFilterConversationsList = (conversation) => {
    return _.size(conversation.metadata.users) > 1;
  }

  handleOnConversationSelected = (event) => {
    const currentConversation = event.detail.conversation;
    console.log(currentConversation.metadata);
    this.setState({
      selectedIdentities: currentConversation.participants,
      selectedConversationId: currentConversation.id,
    });
  }

  handleOnRenderListItem = (widget, dataArray, index) => {
    const conversation = dataArray[index];
    _.each(conversation.metadata.users, (user, key) => {
      db.table('users')
        .add({
          id: key,
          name: user.name,
          image_url: user.image_url || logo,
        })
        .then(res => { console.log(res); })
        .catch(res => false);
    });
  }

  render() {
    const { selectedIdentities, selectedConversationId } = this.state;

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </div>
        <Notifier />
        <div className="App-content">
          <aside className="App-aside">
            <IdentitiesList
              selectedIdentities={selectedIdentities}
              onIdentitySelected={this.handleOnIdentitySelected}
            />
            <ConversationsList
              filter={this.handleFilterConversationsList}
              selectedConversationId={selectedConversationId}
              onConversationSelected={this.handleOnConversationSelected}
              onRenderListItem={this.handleOnRenderListItem}
            />
          </aside>
          <section className="App-main">
            <ConversationPanel
              conversationId={selectedConversationId}
            />
          </section>
        </div>
      </div>
    );
  }
}

export default App;
