import React from 'react';
import { Section, UserPic, SocialProfiles, Intro } from '..';


export default (props) => {
    const { user } = props;
    return (
        <Section>
            <UserPic image={user.pic} />
            <SocialProfiles {...user.socialProfiles} />
            <Intro {...user} />
        </Section>
    )
}