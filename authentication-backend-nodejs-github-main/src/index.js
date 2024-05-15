import connectDB from './db/connectDB.js';
import {app} from './app.js';
import {PROJECT_NAME} from './utils/constants.js';

connectDB()
    .then(
        app.listen(process.env.PORT, () => {
            console.log(`🚀 Server listening on port ${process.env.PORT}`);
            console.log(`Project name: ${PROJECT_NAME}`);
        })
    )
    .catch((err) => console.log(err));
