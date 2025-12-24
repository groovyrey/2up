import React from 'react';
import ProfilePage from "../../../components/ProfilePage";

export default function Profile({ params }) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { id } = resolvedParams;
  return <ProfilePage userId={id} />;
}
