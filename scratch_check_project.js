const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bright-stage');
        const project = await Project.findById('69ed24a2010d3ef69626d91b');
        console.log("PROJECT_CHECK:", JSON.stringify(project.items, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
