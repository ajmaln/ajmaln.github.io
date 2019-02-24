import React, { Component } from 'react';
import { IntroSection, ProjectsSection, SkillsSection } from './components';
import userPic from './assets/ajmal.jpeg';
import './assets/styles.css';


const User = {
  pic: userPic,
  name: 'Ajmal Noushad',
  titles: ['Software Engineer', 'Open Sourcerer', 'Web Dev', 'AI-ML Enthusiast'],
  socialProfiles: {
    github: 'https://github.com/ajmaln',
    linkedin: 'https://linkedin.com/in/ajmaln',
    stackoverflow: 'https://stackoverflow.com/users/7056292/ajmal-noushad'
  },
  resumeLink: 'https://drive.google.com/file/d/1FlcUc8SxnJqnaF832iQZ4RKV7ePhf1re/view?usp=sharing',
  projects: [
    {
      image: 'https://images.idgesg.net/images/article/2018/10/ai_artificial-intelligence_circuit-board_circuitry_mother-board_nodes_computer-chips-100777423-large.jpg',
      title: 'ATM Theft detection',
      date: 'April 2018',
      description: 'Developed a Deep Learning Neural Network for audio classification to identify threats in ATMs as part of the Smart India Hackathon 2018'
    },
    {
      image: 'https://490z7i45htbb1f4tty9mdpi6-wpengine.netdna-ssl.com/wp-content/uploads/2017/11/AI-governance-lead.jpg?resolution=1366,1',
      title: 'Issue Tracking System',
      date: 'April 2018',
      description: 'Developed an Ticket based Issue tracking system using Django Backend for Sophisticated Instrumentation & Computation Center, Kerala University'
    },
    {
      image: 'https://i.imgur.com/uOEhnDE.png',
      title: 'easyKU',
      date: 'September 2018',
      description: 'A web app where you can get results and notifications from Kerala University and subscribe for alerts on new updates. App: https://ajmaln.github.io/easyku/, Repo: https://github.com/ajmaln/easyku'
    },
    {
      image: 'https://i.imgur.com/yqJUkJG.jpg',
      title: 'Pratiti',
      date: 'October 2018',
      description: 'An educational application for medical students. App: https://goo.gl/rEnexn'
    }
  ],
  skills : {
    languages: ['Python', 'Javascript', 'C', 'CPP', 'Java', 'C#', ],
    fandls : ['Django', 'ReactJS', 'Redux', 'NodeJS', 'Firebase Cloud API', 'Git', 'JQuery', 'Django Rest Framework', 'GraphQL'],
    deployment: ['Heroku', 'PythonAnyWhere', 'Amazon Cloud EC2', 'Firebase']
  }
};


class App extends Component {
  render() {
    return (
      <React.Fragment>
        <IntroSection user={User} />
        <ProjectsSection projects={User.projects}/>
        <SkillsSection skills={User.skills} />
      </React.Fragment>
    );
  }
}

export default App;
