import React from 'react';
import './styles.css';


const Section = (props) => {
    return (
        <div className='section'>
            {
                props.children
            }
        </div>
    )
}

export default Section;