// src/v1/controllers/auth/index.js

import * as userRegistration from './userRegistration.js'
import * as teacherConnection from './teacherConnection.js'
import * as parentConnection from './parentConnection.js'

// Combine all
export const authController = {
    ...userRegistration,
    ...teacherConnection,
    ...parentConnection
}


// Eaxport individual for direct import
export { userRegistration, teacherConnection, parentConnection  }


// Export specific function
export const userRegister = userRegistration.userRegister || userRegistration.default?.userRegister;
export const verifyUserEmail = userRegistration.verifyUserEmail || userRegistration.default?.verifyUserEmail;

export const connectTeacher = teacherConnection.connectTeacher || teacherConnection.default?.connectTeacher;
export const verifyTeacherEmail = teacherConnection.verifyTeacherEmail || teacherConnection.default?.verifyTeacherEmail;

export const connectParent = parentConnection.connectParent || parentConnection.default?.connectParent;
export const verifyParentEmail = parentConnection.verifyParentEmail || parentConnection.default?.verifyParentEmail;


export default authController