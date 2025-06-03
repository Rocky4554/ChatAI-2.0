import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer'
import JSON5 from 'json5';


function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)

            // hljs won't reprocess the element unless this attribute is removed
            ref.current.removeAttribute('data-highlighted')
        }
    }, [ props.className, props.children ])

    return <code {...props} ref={ref} />
}


const Project = () => {

    const location = useLocation()

    const [ isSidePanelOpen, setIsSidePanelOpen ] = useState(false)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set()) // Initialized as Set
    const [ project, setProject ] = useState(location.state.project)
    const [ message, setMessage ] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = React.createRef()

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([]) // New state variable for messages
    const [ fileTree, setFileTree ] = useState({})

    const [ currentFile, setCurrentFile ] = useState(null)
    const [ openFiles, setOpenFiles ] = useState([])

    const [ webContainer, setWebContainer ] = useState(null)
    const [ iframeUrl, setIframeUrl ] = useState(null)

    const [ runProcess, setRunProcess ] = useState(null)


    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }

            return newSelectedUserId;
        });


    }


    function addCollaborators() {

        axios.put("/projects/add-user", {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)

        }).catch(err => {
            console.log(err)
        })

    }
// sending message 
    const send = () => {

        sendMessage('project-message', {
            message,
            sender: user
        })
        setMessages(prevMessages => [ ...prevMessages, { sender: user, message } ]) // Update messages state
        setMessage("")

    }

    // displaying the text from response on the UI
    function WriteAiMessage(message) {

        const messageObject = JSON.parse(message)

        return (
            <div
                className='overflow-auto bg-slate-950 text-white rounded-sm p-2'
            >
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>)
    }
//////////////////////////////////////////////////////////////////////////


    useEffect(() => {

        initializeSocket(project._id)

        // here we are starting the web conatiner 
        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container)
                console.log("webcontainer started")
            })
        }

        //here we are displaying the code from ai 
        // receiveMessage('project-message', data => {
        //     console.log("response from ai before parsing", data);
            
        //     if (data.sender._id == 'ai') {
        //         try {
        //             const message = JSON5.parse(data.message);
        //             console.log("message after parsing:", message);

        //             if (message.fileTree && Object.keys(message.fileTree).length > 0) {
        //                 console.log("File Tree before mounting:",message.fileTree);
        //                 webContainer?.mount(message.fileTree);
                
        //                 setFileTree(message.fileTree);
        //             } else {
        //                 console.warn('Received empty fileTree from AI');
        //             }
        //             setMessages(prevMessages => [...prevMessages, data]);
        //         } catch (error) {
        //             console.error('Error parsing AI message:', error);
        //         }
        //     } else {
        //         setMessages(prevMessages => [...prevMessages, data]);
        //     }
        // });


    // experting code 
        receiveMessage('project-message', data => {
            console.log("response from AI before parsing", data);
        
            if (data.sender._id === 'ai') {
                try {
                    const message = JSON5.parse(data.message);
                    console.log("message after parsing:", message);
        
                    if (message.fileTree && Object.keys(message.fileTree).length > 0) {
                        console.log("File Tree before mounting:", message.fileTree);
        
                        // Check if webContainer exists
                        if (!webContainer) {
                            console.error('WebContainer is not initialized');
                            return;
                        }
        
                        // Mount the fileTree and handle potential async behavior
                        try {
                            // If mount is a promise (check your WebContainer API docs)
                            webContainer.mount(message.fileTree)
                                .then(() => {
                                    console.log('WebContainer mounted successfully');
                                    setFileTree(message.fileTree);
                                    setMessages(prevMessages => [...prevMessages, data]);
                                })
                                .catch(error => {
                                    console.error('Failed to mount WebContainer:', error);
                                });
                        } catch (error) {
                            console.error('Error during WebContainer mount:', error);
                        }
                    } else {
                        console.warn('Received empty or invalid fileTree from AI');
                    }
                } catch (error) {
                    console.error('Error parsing AI message:', error);
                }
            } else {
                setMessages(prevMessages => [...prevMessages, data]);
            }
        });


        // here we are setting the project creating by user 
        axios.get(`/projects/get-project/${location.state.project._id}`).then(res => {

            console.log(res.data.project)

            setProject(res.data.project)
            setFileTree(res.data.project.fileTree || {})
        })

        // here we are getting all user from the database
        axios.get('/users/all').then(res => {

            setUsers(res.data.users)

        }).catch(err => {

            console.log(err)

        })

    }, [])


    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }


    // Removed appendIncomingMessage and appendOutgoingMessage functions

    function scrollToBottom() {
        messageBox.current.scrollTop = messageBox.current.scrollHeight
    }

    return (
        <main className='h-screen w-screen flex'>
            <section className="left relative flex flex-col h-screen min-w-96 bg-slate-300">
                <header className='flex justify-between items-center p-2 px-4 w-full bg-slate-100 absolute z-10 top-0'>
                    <button className='flex gap-2' onClick={() => setIsModalOpen(true)}>
                        <i className="ri-add-fill mr-1"></i>
                        <p>Add collaborator</p>
                    </button>
                    <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2'>
                        <i className="ri-group-fill"></i>
                    </button>
                </header>
                <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">

                    <div
                        ref={messageBox}
                        className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide">
                        {messages.map((msg, index) => (
                            <div key={index} className={`${msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'} ${msg.sender._id == user._id.toString() && 'ml-auto'}  message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}>
                                <small className='opacity-65 text-xs'>{msg.sender.email}</small>
                                <div className='text-sm'>
                                    {msg.sender._id === 'ai' ?
                                        WriteAiMessage(msg.message)
                                        : <p>{msg.message}</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="inputField w-full flex absolute bottom-0">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className='p-2 px-4 border-none outline-none flex-grow' type="text" placeholder='Enter message' />
                        <button
                            onClick={send}
                            className='px-5 bg-slate-950 text-white'><i className="ri-send-plane-fill"></i></button>
                    </div>
                </div>
                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-50 absolute transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0`}>
                    <header className='flex justify-between items-center px-4 p-2 bg-slate-200'>

                        <h1
                            className='font-semibold text-lg'
                        >Collaborators</h1>

                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2'>
                            <i className="ri-close-fill"></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2">

                        {project.users && project.users.map(user => {


                            return (
                                <div className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
                                    <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            )


                        })}
                    </div>
                </div>
            </section>

            <section className="right  bg-red-50 flex-grow h-full flex">

                <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
                    <div className="file-tree w-full">
                        {
                            Object.keys(fileTree).map((file, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentFile(file)
                                        setOpenFiles([ ...new Set([ ...openFiles, file ]) ])
                                    }}
                                    className="tree-element cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-300 w-full">
                                    <p
                                        className='font-semibold text-lg'
                                    >{file}</p>
                                </button>))


                        }
                    </div>

                </div>


                <div className="code-editor flex flex-col flex-grow h-full shrink">

                    <div className="top flex justify-between w-full">

                        <div className="files flex">
                            {
                                openFiles.map((file, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentFile(file)}
                                        className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-slate-300 ${currentFile === file ? 'bg-slate-400' : ''}`}>
                                        <p
                                            className='font-semibold text-lg'
                                        >{file}</p>
                                    </button>
                                ))
                            }
                        </div>
                            {/* the run button */}
                        <div className="actions flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        if (!fileTree || Object.keys(fileTree).length === 0) {
                                            console.error('No files to mount');
                                            return;
                                        }

                                        if (!webContainer) {
                                            console.error('WebContainer not initialized');
                                            return;
                                        }

                                        await webContainer.mount(fileTree);

                                        const installProcess = await webContainer.spawn("npm", ["install"]);
                                        installProcess.output.pipeTo(new WritableStream({
                                            write(chunk) {
                                                console.log("Installation output:", chunk);
                                            }
                                        }));

                                        if (runProcess) {
                                            runProcess.kill();
                                        }

                                        let tempRunProcess = await webContainer.spawn("npm", ["start"]);
                                        tempRunProcess.output.pipeTo(new WritableStream({
                                            write(chunk) {
                                                console.log("Run output:", chunk);
                                            }
                                        }));

                                        setRunProcess(tempRunProcess);

                                        webContainer.on('server-ready', (port, url) => {
                                            console.log("Server ready on port:", port, "URL:", url);
                                            setIframeUrl(url);
                                        });
                                    } catch (error) {
                                        console.error('Error running project:', error);
                                    }
                                }}
                                className='p-2 px-4 bg-slate-300 text-white'
                            >
                                run
                            </button>


                        </div>
                    </div>
                    <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
                        {
                            fileTree[currentFile]?.file?.contents && (
                                <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-50">
                                    <pre
                                        className="hljs h-full">
                                        <code
                                            className="hljs h-full outline-none"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                const updatedContent = e.target.innerText;
                                                const ft = {
                                                    ...fileTree,
                                                    [currentFile]: {
                                                        file: {
                                                            contents: updatedContent
                                                        }
                                                    }
                                                }
                                                setFileTree(ft)
                                                saveFileTree(ft)
                                            }}
                                            dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value }}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                paddingBottom: '25rem',
                                                counterSet: 'line-numbering',
                                            }}
                                        />
                                    </pre>
                                </div>
                            )
                        }
                    </div>

                </div>

                {iframeUrl && webContainer &&
                    (<div className="flex min-w-96 flex-col h-full">
                        <div className="address-bar">
                            <input type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl} className="w-full p-2 px-4 bg-slate-200" />
                        </div>
                        <iframe src={iframeUrl} className="w-full h-full"></iframe>
                    </div>)
                }


            </section>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold'>Select User</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
                            {users.map(user => (
                                <div key={user.id} className={`user cursor-pointer hover:bg-slate-200 ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-slate-200' : ""} p-2 flex gap-2 items-center`} onClick={() => handleUserClick(user._id)}>
                                    <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md'>
                            Add Collaborators
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project














//// experiment code 


// import React, { useState, useEffect, useContext, useRef } from 'react';
// import { UserContext } from '../context/user.context';
// import { useNavigate, useLocation } from 'react-router-dom';
// import axios from '../config/axios';
// import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
// import Markdown from 'markdown-to-jsx';
// import hljs from 'highlight.js';
// import 'highlight.js/styles/default.css';
// import 'remixicon/fonts/remixicon.css';
// import { getWebContainer } from '../config/webcontainer';
// import JSON5 from 'json5';


// // SyntaxHighlightedCode component for Markdown code blocks
// function SyntaxHighlightedCode(props) {
//   const ref = useRef(null);

//   React.useEffect(() => {
//     if (ref.current && props.className?.includes('lang-') && window.hljs) {
//       window.hljs.highlightElement(ref.current);
//       ref.current.removeAttribute('data-highlighted');
//     }
//   }, [props.className, props.children]);

//   return <code {...props} ref={ref} />;
// }

// // FileTreeUtils for managing file tree operations
// const FileTreeUtils = {
//   getAllFiles: (fileTree, currentPath = '') => {
//     const files = [];
//     Object.keys(fileTree).forEach(key => {
//       const fullPath = currentPath ? `${currentPath}/${key}` : key;
//       if (fileTree[key].file) {
//         files.push({
//           path: fullPath,
//           name: key,
//           contents: fileTree[key].file.contents,
//           type: 'file'
//         });
//       } else if (fileTree[key].directory) {
//         files.push({
//           path: fullPath,
//           name: key,
//           type: 'directory'
//         });
//         const subFiles = FileTreeUtils.getAllFiles(fileTree[key].directory, fullPath);
//         files.push(...subFiles);
//       }
//     });
//     return files;
//   },

//   getFileByPath: (fileTree, filePath) => {
//     const pathParts = filePath.split('/');
//     let current = fileTree;
//     for (let i = 0; i < pathParts.length - 1; i++) {
//       if (current[pathParts[i]]?.directory) {
//         current = current[pathParts[i]].directory;
//       } else {
//         return null;
//       }
//     }
//     const fileName = pathParts[pathParts.length - 1];
//     return current[fileName]?.file || null;
//   },

//   updateFileByPath: (fileTree, filePath, newContents) => {
//     const pathParts = filePath.split('/');
//     const newFileTree = JSON.parse(JSON.stringify(fileTree)); // Deep clone
//     let current = newFileTree;
//     for (let i = 0; i < pathParts.length - 1; i++) {
//       if (current[pathParts[i]]?.directory) {
//         current = current[pathParts[i]].directory;
//       } else {
//         return fileTree; // Path doesn't exist
//       }
//     }
//     const fileName = pathParts[pathParts.length - 1];
//     if (current[fileName]?.file) {
//       current[fileName].file.contents = newContents;
//     }
//     return newFileTree;
//   }
// };

// const Project = () => {
//   const location = useLocation();
//   const { user } = useContext(UserContext);
//   const messageBox = useRef(null);
//   const navigate = useNavigate();

//   // State management
//   const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedUserId, setSelectedUserId] = useState(new Set());
//   const [project, setProject] = useState(location.state.project);
//   const [message, setMessage] = useState('');
//   const [users, setUsers] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [fileTree, setFileTree] = useState({});
//   const [currentFile, setCurrentFile] = useState(null);
//   const [openFiles, setOpenFiles] = useState([]);
//   const [webContainer, setWebContainer] = useState(null);
//   const [iframeUrl, setIframeUrl] = useState(null);
//   const [runProcess, setRunProcess] = useState(null);
//   const [expandedDirs, setExpandedDirs] = useState(new Set(['src']));

//   // Initialize WebContainer, socket, and fetch data
//   useEffect(() => {
//     initializeSocket(project._id);

//     if (!webContainer) {
//       getWebContainer().then(container => {
//         setWebContainer(container);
//         console.log('WebContainer started');
//       }).catch(error => {
//         console.error('Failed to initialize WebContainer:', error);
//       });
//     }

//     // Fetch project data
//     axios.get(`/projects/get-project/${location.state.project._id}`)
//       .then(res => {
//         setProject(res.data.project);
//         setFileTree(res.data.project.fileTree || {});
//       })
//       .catch(err => console.error(err));

//     // Fetch users
//     axios.get('/users/all')
//       .then(res => setUsers(res.data.users))
//       .catch(err => console.error(err));

//     // Cleanup
//     return () => {
//       if (webContainer) {
//         webContainer.teardown();
//       }
//     };
//   }, []);

//   // Handle incoming messages
//   useEffect(() => {
//     receiveMessage('project-message', data => {
//       console.log('Response from AI before parsing', data);
//       if (data.sender._id === 'ai') {
//         try {
//           const message = JSON5.parse(data.message);
//           console.log('Message after parsing:', message);

//           if (message.fileTree && Object.keys(message.fileTree).length > 0) {
//             console.log('File Tree before mounting:', message.fileTree);

//             // Validate fileTree
//             const files = FileTreeUtils.getAllFiles(message.fileTree);
//             if (!files.some(file => file.type === 'file')) {
//               console.warn('No valid files found in fileTree');
//               return;
//             }

//             if (!webContainer) {
//               console.error('WebContainer not initialized');
//               return;
//             }

//             // Mount fileTree
//             webContainer.mount(message.fileTree)
//               .then(async () => {
//                 console.log('WebContainer mounted successfully');
//                 const mountedFiles = await webContainer.fs.readdir('/');
//                 console.log('Mounted files:', mountedFiles);
//                 setFileTree(message.fileTree);
//                 setMessages(prevMessages => [...prevMessages, data]);
//               })
//               .catch(error => {
//                 console.error('Failed to mount WebContainer:', error);
//               });
//           } else {
//             console.warn('Received empty or invalid fileTree from AI');
//           }
//         } catch (error) {
//           console.error('Error parsing AI message:', error);
//         }
//       } else {
//         setMessages(prevMessages => [...prevMessages, data]);
//       }
//     });
//   }, [webContainer]);

//   // Scroll to bottom of message box
//   useEffect(() => {
//     if (messageBox.current) {
//       messageBox.current.scrollTop = messageBox.current.scrollHeight;
//     }
//   }, [messages]);

//   // Toggle directory expansion
//   const toggleDirectory = (dirPath) => {
//     setExpandedDirs(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(dirPath)) {
//         newSet.delete(dirPath);
//       } else {
//         newSet.add(dirPath);
//       }
//       return newSet;
//     });
//   };

//   // Render file tree item
//   const renderFileTreeItem = (key, item, currentPath = '', depth = 0) => {
//     const fullPath = currentPath ? `${currentPath}/${key}` : key;
//     const indent = depth * 20;

//     if (item.directory) {
//       const isExpanded = expandedDirs.has(fullPath);
//       return (
//         <div key={fullPath}>
//           <button
//             onClick={() => toggleDirectory(fullPath)}
//             className="tree-element cursor-pointer p-2 flex items-center gap-2 bg-slate-200 w-full hover:bg-slate-300"
//             style={{ paddingLeft: `${indent + 16}px` }}
//           >
//             <i className={`ri-${isExpanded ? 'folder-open' : 'folder'}-fill text-blue-600`}></i>
//             <span className="font-medium">{key}</span>
//             <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line ml-auto text-xs`}></i>
//           </button>
//           {isExpanded && (
//             <div className="directory-contents">
//               {Object.keys(item.directory).map(subKey =>
//                 renderFileTreeItem(subKey, item.directory[subKey], fullPath, depth + 1)
//               )}
//             </div>
//           )}
//         </div>
//       );
//     } else if (item.file) {
//       return (
//         <button
//           key={fullPath}
//           onClick={() => {
//             setCurrentFile(fullPath);
//             setOpenFiles([...new Set([...openFiles, fullPath])]);
//           }}
//           className={`tree-element cursor-pointer p-2 flex items-center gap-2 w-full hover:bg-slate-300 ${
//             currentFile === fullPath ? 'bg-slate-400' : 'bg-slate-200'
//           }`}
//           style={{ paddingLeft: `${indent + 16}px` }}
//         >
//           <i className="ri-file-text-fill text-gray-600"></i>
//           <span className="font-medium text-sm">{key}</span>
//         </button>
//       );
//     }
//     return null;
//   };

//   // Save file tree
//   function saveFileTree(ft) {
//     axios.put('/projects/update-file-tree', {
//       projectId: project._id,
//       fileTree: ft
//     })
//       .then(res => console.log(res.data))
//       .catch(err => console.error(err));
//   }

//   // Handle collaborator selection
//   const handleUserClick = (id) => {
//     setSelectedUserId(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(id)) {
//         newSet.delete(id);
//       } else {
//         newSet.add(id);
//       }
//       return newSet;
//     });
//   };

//   // Add collaborators
//   function addCollaborators() {
//     axios.put('/projects/add-user', {
//       projectId: location.state.project._id,
//       users: Array.from(selectedUserId)
//     })
//       .then(res => {
//         console.log(res.data);
//         setIsModalOpen(false);
//       })
//       .catch(err => console.error(err));
//   }

//   // Send message
//   const send = () => {
//     sendMessage('project-message', {
//       message,
//       sender: user
//     });
//     setMessages(prevMessages => [...prevMessages, { sender: user, message }]);
//     setMessage('');
//   };

//   // Render AI message with Markdown
//   function WriteAiMessage(message) {
//     const messageObject = JSON5.parse(message);
//     return (
//       <div className="overflow-auto bg-slate-950 text-white rounded-sm p-2">
//         <Markdown
//           children={messageObject.text}
//           options={{
//             overrides: {
//               code: SyntaxHighlightedCode,
//             },
//           }}
//         />
//       </div>
//     );
//   }

//   return (
//     <main className="h-screen w-screen flex">
//       <section className="left relative flex flex-col h-screen min-w-96 bg-slate-300">
//         <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100 absolute z-10 top-0">
//           <button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
//             <i className="ri-add-fill mr-1"></i>
//             <p>Add collaborator</p>
//           </button>
//           <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2">
//             <i className="ri-group-fill"></i>
//           </button>
//         </header>
//         <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">
//           <div
//             ref={messageBox}
//             className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide"
//           >
//             {messages.map((msg, index) => (
//               <div
//                 key={index}
//                 className={`${
//                   msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'
//                 } ${msg.sender._id === user._id.toString() && 'ml-auto'} message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}
//               >
//                 <small className="opacity-65 text-xs">{msg.sender.email}</small>
//                 <div className="text-sm">
//                   {msg.sender._id === 'ai' ? WriteAiMessage(msg.message) : <p>{msg.message}</p>}
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div className="inputField w-full flex absolute bottom-0">
//             <input
//               value={message}
//               onChange={e => setMessage(e.target.value)}
//               className="p-2 px-4 border-none outline-none flex-grow"
//               type="text"
//               placeholder="Enter message"
//             />
//             <button onClick={send} className="px-5 bg-slate-950 text-white">
//               <i className="ri-send-plane-fill"></i>
//             </button>
//           </div>
//         </div>
//         <div
//           className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-50 absolute transition-all ${
//             isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'
//           } top-0`}
//         >
//           <header className="flex justify-between items-center px-4 p-2 bg-slate-200">
//             <h1 className="font-semibold text-lg">Collaborators</h1>
//             <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2">
//               <i className="ri-close-fill"></i>
//             </button>
//           </header>
//           <div className="users flex flex-col gap-2">
//             {project.users &&
//               project.users.map(user => (
//                 <div key={user._id} className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
//                   <div className="aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600">
//                     <i className="ri-user-fill absolute"></i>
//                   </div>
//                   <h1 className="font-semibold text-lg">{user.email}</h1>
//                 </div>
//               ))}
//           </div>
//         </div>
//       </section>

//       <section className="right bg-red-50 flex-grow h-full flex">
//         <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
//           <div className="file-tree w-full">
//             {Object.keys(fileTree).map(key => renderFileTreeItem(key, fileTree[key]))}
//           </div>
//         </div>

//         <div className="code-editor flex flex-col flex-grow h-full shrink">
//           <div className="top flex justify-between w-full">
//             <div className="files flex">
//               {openFiles.map((filePath, index) => (
//                 <button
//                   key={index}
//                   onClick={() => setCurrentFile(filePath)}
//                   className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-slate-300 ${
//                     currentFile === filePath ? 'bg-slate-400' : ''
//                   }`}
//                 >
//                   <span className="font-semibold text-sm">{filePath.split('/').pop()}</span>
//                   <button
//                     onClick={e => {
//                       e.stopPropagation();
//                       setOpenFiles(prev => prev.filter(f => f !== filePath));
//                       if (currentFile === filePath) {
//                         const remainingFiles = openFiles.filter(f => f !== filePath);
//                         setCurrentFile(remainingFiles[remainingFiles.length - 1] || null);
//                       }
//                     }}
//                     className="ml-2 text-red-500 hover:text-red-700"
//                   >
//                     ×
//                   </button>
//                 </button>
//               ))}
//             </div>
//             <div className="actions flex gap-2">
//               <button
//                 onClick={async () => {
//                   try {
//                     if (!fileTree || Object.keys(fileTree).length === 0) {
//                       console.error('No files to mount');
//                       return;
//                     }

//                     // Validate fileTree
//                     const files = FileTreeUtils.getAllFiles(fileTree);
//                     if (!files.some(file => file.type === 'file')) {
//                       console.error('No valid files found in fileTree');
//                       return;
//                     }

//                     if (!webContainer) {
//                       console.error('WebContainer not initialized');
//                       return;
//                     }

//                     // Mount fileTree
//                     await webContainer.mount(fileTree);
//                     console.log('Files mounted successfully');
//                     const mountedFiles = await webContainer.fs.readdir('/');
//                     console.log('Mounted files:', mountedFiles);

//                     // Install dependencies
//                     const installProcess = await webContainer.spawn('npm', ['install']);
//                     const installExitCode = await installProcess.exit;
//                     if (installExitCode !== 0) {
//                       console.error('Installation failed');
//                       return;
//                     }

//                     // Kill existing process
//                     if (runProcess) {
//                       runProcess.kill();
//                     }

//                     // Start development server
//                     const tempRunProcess = await webContainer.spawn('npm', ['run', 'dev']);
//                     setRunProcess(tempRunProcess);

//                     // Listen for server-ready event
//                     webContainer.on('server-ready', (port, url) => {
//                       console.log('Server ready on port:', port, 'URL:', url);
//                       setIframeUrl(url);
//                     });
//                   } catch (error) {
//                     console.error('Error running project:', error);
//                   }
//                 }}
//                 className="p-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
//               >
//                 <i className="ri-play-fill mr-1"></i>
//                 Run
//               </button>
//             </div>
//           </div>
//           <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
//             {currentFile &&
//               (() => {
//                 const file = FileTreeUtils.getFileByPath(fileTree, currentFile);
//                 return file?.contents ? (
//                   <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-50">
//                     <pre className="hljs h-full">
//                       <code
//                         className="hljs h-full outline-none"
//                         contentEditable
//                         suppressContentEditableWarning
//                         onBlur={e => {
//                           const updatedContent = e.target.innerText;
//                           const updatedFileTree = FileTreeUtils.updateFileByPath(
//                             fileTree,
//                             currentFile,
//                             updatedContent
//                           );
//                           setFileTree(updatedFileTree);
//                           saveFileTree(updatedFileTree);
//                         }}
//                         dangerouslySetInnerHTML={{
//                           __html: hljs.highlight('javascript', file.contents).value
//                         }}
//                         style={{
//                           whiteSpace: 'pre-wrap',
//                           paddingBottom: '25rem',
//                           counterSet: 'line-numbering',
//                         }}
//                       />
//                     </pre>
//                   </div>
//                 ) : null;
//               })()}
//           </div>
//         </div>

//         {iframeUrl && webContainer && (
//           <div className="flex min-w-96 flex-col h-full">
//             <div className="address-bar">
//               <input
//                 type="text"
//                 onChange={e => setIframeUrl(e.target.value)}
//                 value={iframeUrl}
//                 className="w-full p-2 px-4 bg-slate-200"
//               />
//             </div>
//             <iframe src={iframeUrl} className="w-full h-full" title="Project Preview"></iframe>
//           </div>
//         )}
//       </section>

//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
//           <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
//             <header className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-semibold">Select User</h2>
//               <button onClick={() => setIsModalOpen(false)} className="p-2">
//                 <i className="ri-close-fill"></i>
//               </button>
//             </header>
//             <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
//               {users.map(user => (
//                 <div
//                   key={user._id}
//                   className={`user cursor-pointer hover:bg-slate-200 ${
//                     selectedUserId.has(user._id) ? 'bg-slate-200' : ''
//                   } p-2 flex gap-2 items-center`}
//                   onClick={() => handleUserClick(user._id)}
//                 >
//                   <div className="aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600">
//                     <i className="ri-user-fill absolute"></i>
//                   </div>
//                   <h1 className="font-semibold text-lg">{user.email}</h1>
//                 </div>
//               ))}
//             </div>
//             <button
//               onClick={addCollaborators}
//               className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md"
//             >
//               Add Collaborators
//             </button>
//           </div>
//         </div>
//       )}
//     </main>
//   );
// };

// export default Project;
