require("dotenv").config();

async function listModels() {

    try {

        const response = await ai.models.list();

        for await (const model of response) {

            console.log(model.name);

        }

    } catch (error) {

        console.error("Model List Error:", error);

    }

}

listModels();