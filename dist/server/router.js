"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const _ = require("lodash");
const Router = require("koa-router");
const IPFS = require("ipfs-api");
const Web3 = require("web3");
const geolite2 = require("geolite2");
const maxmind = require("maxmind");
const IP = require("public-ip");
const urllib_1 = require("urllib");
const logger_1 = require("../utils/logger");
const router = new Router();
const ipfs = IPFS({
    host: 'localhost',
    port: 5001,
    protocol: 'http',
});
const web3 = new Web3('http://localhost:8545');
const logger = logger_1.LoggerFactory.getLabeledInstance('server', 'router');
const uploadAsync = util_1.promisify(ipfs.files.add);
const getFileListAsync = util_1.promisify(ipfs.files.ls);
const getIpfsNodeId = util_1.promisify(ipfs.id);
const getIpfsSwarmPeers = util_1.promisify(ipfs.swarm.peers);
const readFileAsync = util_1.promisify(fs_1.readFile);
router.get('/', async (ctx, next) => {
    ctx.body = 'Hello, Heronode!';
    await next();
});
router.post('/api/ipfs/upload/raw', async (ctx, next) => {
    const body = ctx.request.fields;
    const content = _.get(body, 'content');
    if (!content) {
        logger.info('body content is empty!');
        ctx.status = 500;
        ctx.body = 'please make sure content field is not empty';
        await next;
        return;
    }
    logger.info(`uploading content: ${content}`);
    try {
        const resp = await uploadAsync(Buffer.from(content));
        ctx.body = resp;
    }
    catch (err) {
        ctx.body = err;
        ctx.status = 500;
    }
    await next;
});
router.post('/api/ipfs/upload/file', async (ctx, next) => {
    const body = _.head(_.values(ctx.request.fields));
    const filePath = _.get(_.head(body), 'path');
    logger.info(`uploading content with path: ${filePath}`);
    const fileContent = await readFileAsync(filePath);
    const resp = await uploadAsync(fileContent);
    ctx.body = resp;
    await next;
});
router.get('/api/ipfs/cat', async (ctx, next) => {
    const ipfsPath = ctx.query.path;
    try {
        const resp = await ipfs.files.cat(ipfsPath);
        ctx.body = resp;
    }
    catch (err) {
        ctx.body = err;
        ctx.status = 500;
    }
    await next;
});
router.get('/dashboard', async (ctx) => {
    await ctx.redirect('/dashboard/home');
});
router.get('/dashboard/home', async (ctx) => {
    await ctx.render('home');
});
router.get('/dashboard/files', async (ctx) => {
    await ctx.render('files');
});
router.get('/dashboard/geo', async (ctx) => {
    await ctx.render('geo');
});
router.get('/dashboard/node', async (ctx) => {
    await ctx.render('nodes');
});
router.get('/internal/nodeinfo', async (ctx) => {
    const [nodeId, peers] = await Promise.all([
        getIpfsNodeId(),
        getIpfsSwarmPeers(),
    ]);
    const addrs = _.reduce(peers, (accu, peer) => {
        const addrInfoArr = peer.addr.toString().split('/');
        accu.push(addrInfoArr[2]);
        return accu;
    }, []);
    let gethInfo;
    try {
        const gethInfoResp = await urllib_1.request('http://localhost:8545', {
            method: 'POST',
            contentType: 'json',
            data: {
                jsonrpc: '2.0',
                method: 'web3_clientVersion',
                params: [],
                id: 67,
            },
        });
        gethInfo = JSON.parse(_.get(gethInfoResp, 'data').toString());
    }
    catch (err) {
        logger.error(err);
    }
    ctx.body = {
        nodeId,
        addrs,
        eth: gethInfo,
    };
});
router.get('/internal/geo', async (ctx, next) => {
    const lookup = maxmind.openSync(geolite2.paths.city);
    const peers = await getIpfsSwarmPeers();
    const addrs = _.reduce(peers, (accu, peer) => {
        const addrInfoArr = peer.addr.toString().split('/');
        accu.push(addrInfoArr[2]);
        return accu;
    }, []);
    const geos = _.reduce(addrs, (accu, el) => {
        if (el) {
            const location = _.get(lookup.get(el), 'location');
            if (location) {
                _.set(location, 'id', el.split('.').join(''));
                _.set(location, 'ip', el);
                _.set(location, 'weight', Math.sqrt(Math.random() * 10));
                accu.push(location);
            }
        }
        return accu;
    }, []);
    const ip = await IP.v4();
    const currentLocation = _.get(lookup.get(ip), 'location');
    currentLocation.ip = ip;
    currentLocation.id = ip.split('.').join('');
    currentLocation.weight = Math.sqrt(10);
    ctx.body = { currentLocation, geos };
});
router.get('/internal/filelist', async (ctx, next) => {
    ipfs.refs.local(function (err, files) {
        console.log(err, files);
        ctx.body = 123;
    });
});
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6Ii9zcmMvIiwic291cmNlcyI6WyJzZXJ2ZXIvcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQThCO0FBQzlCLCtCQUFpQztBQUNqQyw0QkFBNEI7QUFDNUIscUNBQXFDO0FBQ3JDLGlDQUFpQztBQUNqQyw2QkFBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLG1DQUFtQztBQUNuQyxnQ0FBZ0M7QUFDaEMsbUNBQWlDO0FBRWpDLDRDQUFnRDtBQUVoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO0FBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNoQixJQUFJLEVBQUUsV0FBVztJQUNqQixJQUFJLEVBQUUsSUFBSTtJQUNWLFFBQVEsRUFBRSxNQUFNO0NBQ2pCLENBQUMsQ0FBQztBQUNILE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFL0MsTUFBTSxNQUFNLEdBQUcsc0JBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDcEUsTUFBTSxXQUFXLEdBQUcsZ0JBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sYUFBYSxHQUFHLGdCQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0saUJBQWlCLEdBQUcsZ0JBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RELE1BQU0sYUFBYSxHQUFHLGdCQUFTLENBQUMsYUFBUSxDQUFDLENBQUM7QUFFMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFB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