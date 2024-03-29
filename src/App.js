/*global chrome*/

import React, { Component } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import Chat from './Components/Chat';

class App extends Component {
	constructor(props) {
		super(props);
		this.constraintsRef = React.createRef();
	}

	render() {
		return (
			<motion.div className="App" ref={this.constraintsRef}>
				<Chat
					settings={this.props}
					currentStreamer={this.props.currentStreamer}
					constraintsRef={this.constraintsRef}
				/>
			</motion.div>
		);
	}
}

export default App;
