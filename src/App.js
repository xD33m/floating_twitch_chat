/*global chrome*/

import React, { useRef } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import Chat from './Components/Chat';

function App() {
	const constraintsRef = useRef(null);
	return (
		<motion.div className="App" ref={constraintsRef}>
			<Chat constraintsRef={constraintsRef} />
		</motion.div>
	);
}

export default App;
