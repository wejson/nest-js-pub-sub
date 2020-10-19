const {PubSub} = require('@google-cloud/pubsub');

const {Command} = require('commander');
const L = (msg, args) => console.log(`[SEED] ${new Date()} : ${msg}`, args || '')

async function initPubSub(args) {
    const {project, topic, sub, url, sleep} = args;
    try {
        console.table([url, sleep, project, topic, sub]);
        L(`sleep for ${sleep}`)
        await new Promise((resolve) => setTimeout(resolve, sleep * 1000))
        const pubsub = new PubSub({
            projectId: project, apiEndpoint: url
        });
        L(`connected to pub sub ${url} ${project}`);
        const [topicInstance] = await pubsub.createTopic(topic);
        const topicName = topicInstance.name;
        L('created topic ', topicName);
        await pubsub.topic(topicName).createSubscription(sub);
        L('created sub ', sub);
        return 'success';
    } catch (e) {
        L(`${e}`);
    }
}


const program = new Command();

async function main() {
    program.version('0.0.1');
    program
        .command('init')
        .option('--url <url>', 'url:port for pub sub', 'pubsub-service:8432')
        .option('--sleep <sleep>', 'time to wait in seconds for pub sub to start', Number, 10)
        .option('--project <project>', 'project id name', 'example-project-id')
        .option('--topic <topic>', 'topic name', 'test-example-topic')
        .option('--sub <sub>', 'subscription name', 'test-example-sub')
        .action(initPubSub)

    await program.parseAsync(process.argv);

}

main().then(res => console.log(res || 'done')).catch(console.error)
