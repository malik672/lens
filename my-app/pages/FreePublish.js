import React from "react";
import { useState, useEffect } from "react";
import Header from "../components/Header";
import { lensHub } from "../api/lens-hub";
import { createPostTypedData } from "../api/mutations/post";
import {
  signedTypeData,
  getAddressFromSigner,
  splitSignature,
} from "../api/ether.service";
import { client } from "../api/auth";
import { v4 as uuid } from "uuid";
import { gql } from "@apollo/client/core";
import { createClient } from "../api/api.js";
import { index } from "../api/indexer";
import { approveModule } from "../api/approve";
import { collect } from "../api/collect";
import { publicationId, collectNft } from "../api/queries/publicationId";
import { ProfileContext } from "../components/ProfileContext";
import { useContext } from "react";
import LitJsSdk from "@lit-protocol/sdk-browser";

const Publish = () => {
  const [id, setID] = useState("");
  const [loading, setNetworkLoading] = useState("");
  const { profile } = useContext(ProfileContext);
  const grey = profile;
  const receiver = "0x30bE4D758d86cfb1Ae74Ae698f2CF4BA7dC8d693";

  useEffect(() => {
    document.addEventListener('lit-ready', function (e) {
      console.log('LIT network is ready')
      setNetworkLoading(false) // replace this line with your own code that tells your app the network is ready
    }, false)
  })

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [modules, setModule] = useState();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [tags, setTags] = useState([""]);
  const [mature, setMature] = useState(false);
  const [file, setFile] = useState("");
  const [type, setType] = useState();
  const [key, setKey] = useState("");
  const [data, setData] = useState("");
  const [copy, setCopy] = useState("")

  //type post data
  const CREATE_POST_TYPED_DATA = `
  mutation($request: CreatePublicPostRequest!) { 
    createPostTypedData(request: $request) {
      id
      expiresAt
      typedData {
        types {
          PostWithSig {
            name
            type
          }
        }
      domain {
        name
        chainId
        version
        verifyingContract
      }
      value {
        nonce
        deadline
        profileId
        contentURI
        collectModule
        collectModuleInitData
        referenceModule
        referenceModuleInitData
      }
    }
  }
}
`;

  //typings
  const createPostTypedDatas = async (createPostTypedDataRequest) => {
    const year = await createClient();
    return year.mutate({
      mutation: gql(CREATE_POST_TYPED_DATA),
      variables: {
        request: createPostTypedDataRequest,
      },
    });
  };

  //set options for html element
  const options = [
    { value: false, text: "Everyone can comment" },
    { value: true, text: "only followers can comment" },
  ];

  const [bool, setBool] = useState(options[0].value);

  const handleChange = (event) => {
    setBool(event.target.value);
  };

  const onChanges = async (event) => {
    const red = event.target.files[0];
    const added = await client.add(red);
    const uri = `https://lenspads.infura-ipfs.io/ipfs/${added.path}`;
    const reds = `ipfs://${added.path}`;
    setUrl(reds);
    setType(red.type);
  };

  const onChanged = async (event) => {
    const win = typeof window !== "undefined" ? window : "";
    const red = event.target.files[0];
    const fer = await LitJsSdk.blobToBase64String(red);
    setFile(fer);
  };

  // permission select
  const permissionOption = [
    { value: false, text: "Everyone can collect" },
    { value: true, text: "only followers can collect" },
  ];

  const [boolf, setBoolF] = useState(false);

  

  const permission = (e) => {
    setBoolF(e.target.value);
  };

  //upload to ipfs
  async function uploadToIpfs() {
    console.log(type, url);
    const metadata = {
      version: "2.0.0",
      metadata_id: uuid(),
      description: `${description}`,
      mainContentFocus: "IMAGE",
      content: `${description}`,
      external_url: null,
      image: `${url}`,
      imageMimeType: `${type}`,
      name: `${title}`,
      attributes: [
        {
          traitType: "string",
          key: "type",
          value: "post",
        },
        {
          traitType: "string",
          key: "data",
          value: `${data}`,
        },
        // {
        //   traitType: "string",
        //   key: "key",
        //   value: `${key}`,
        // },
      ],
      media: [
        {
          item: `${url}`,
          type: `${type}`,
        },
      ],
      locale: "en",
      createdOn: new Date(),
      appId: "lensook",
    };

    const added = await client.add(JSON.stringify(metadata));
    const uri = `https://lenspads.infura-ipfs.io/ipfs/${added.path}`;
    const red = `ipfs://${added.path}`;
    console.log(red);
    const err = await client.pin.add(added.cid);
    console.log(uri);
    return red;
  }

  //result post
  async function post() {
    console.log(receiver, token, val, id, bool);
    const postUri = await uploadToIpfs();

    const free = {
      "profileId": `${profile}`,
      "contentURI": `${postUri}`,
      "collectModule": {
          "freeCollectModule":  {
              "followerOnly": false
           }
      },
      referenceModule: {
          "followerOnlyReferenceModule": false
      }
   }

    const result = await createPostTypedDatas(free);

    console.log(result);
    const typedData = result.data.createPostTypedData.typedData;

    const signature = await signedTypeData(
      typedData.domain,
      typedData.types,
      typedData.value
    );
    const { v, r, s } = await splitSignature(signature);

    const peri = await lensHub();
    const tx = await peri.functions.postWithSig({
      profileId: typedData.value.profileId,
      contentURI: typedData.value.contentURI,
      collectModule: typedData.value.collectModule,
      collectModuleInitData: typedData.value.collectModuleInitData,
      referenceModule: typedData.value.referenceModule,
      referenceModuleInitData: typedData.value.referenceModuleInitData,
      sig: {
        v,
        r,
        s,
        deadline: typedData.value.deadline,
      },
    });
    return tx;
  }

  const postPad = async (e) => {
    e.preventDefault();
    // const ted = await Lit(file);
    // setData(ted[0]);
    // setKey(ted[1]);
    document.querySelector("#form").reset();
    const red = await post();
    console.log(await red.hash);
    console.log(await index(red.hash));
    console.log("sucessful indexed");
    const rec = {currency:token, value: val, collectModule:"FeeCollectModule"};
    const re = await approveModule(rec);
    const pubId = await publicationId(red.hash)
    console.log(pubId)
    const green = pubId.data.publication.id;
    const reds = {publicationId: pubId.data.publication.id}
    const t = await collect(reds);
    // const f = await t.wait();
    // console.log());
    // console.log("collected successfully");
    // const collectsNFT = await collectNft(green);
    // const collectAdd = collectsNFT.data.publication.collectNftAddress;
    // const meta = collectsNFT.data.publication.metadata.attributes[2].value;
    // await save(collectAdd, meta);
  };

  return (
    <div>
      <Header />
      <div style={{ paddingTop: "65px" }}>
        <h1>Publish</h1>
        <button onClick={(e) => createPostTypedDatas()}>frr</button>
      </div>
      <div className="rounded-lg shadow-md p-3">
        <form id="form" onSubmit={postPad}>
          <div className="justify-between flex">
            <section
              className="flex flex-wrap -mx-3 mb-6 p-10 "
              style={{ flexDirection: "column" }}
            >
              <div
                class="w-full md:w-1/2 px-3 mb-6 md:mb-0"
                style={{ width: "100%" }}
              >
                <label
                  className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                  for="grid-first-title"
                >
                  Title
                </label>
                <input
                  required
                  onChange={(e) => setTitle(e.target.value)}
                  class="appearance-none block w-full bg-gray-200 text-gray-700 border border-green-500 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                  id="grid-first-title"
                  type="text"
                  placeholder="Title"
                />
                <p class="text-gray-500 text-xs italic mb-4">
                  Please fill in a title.
                </p>
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label
                  className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                  for="grid-last-name"
                >
                  Author
                </label>
                <input
                  required
                  class="appearance-none block w-full bg-gray-200 text-gray-700 border border-green-500 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                  id="grid-last-name"
                  type="text"
                  placeholder="Author"
                />
              </div>
              <div className="flex flex-wrap -mx-3 mb-6 mt-8 pt-6, pl-2.5">
                <div className="w-full px-3">
                  <label
                    class="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                    for="grid-desription"
                  >
                    Description
                  </label>
                  <textarea
                    row="30"
                    class="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    id="grid-description"
                    type="text"
                    placeholder="Description"
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                  <p class="text-gray-600 text-xs italic">
                    Write a description, books with desription tends to be more
                    seen{" "}
                  </p>
                </div>
              </div>
              <div className="w-full md:w-1/2 px-3 mt-6">
                <label
                  className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                  for="grid-last-name"
                >
                  Permission:
                </label>
                <select
                  required
                  value={bool}
                  onChange={handleChange}
                  class="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  id="grid-last-name"
                  placeholder="Permission"
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.text}
                    </option>
                  ))}
                </select>
                <p class="text-gray-600 text-xs italic">
                  select whether only follower can review or not
                </p>
              </div>
              <div className="w-full md:w-1/2 px-3 mt-6">
                <label
                  className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                  for="grid-last-name"
                >
                  Select a cover image/video for the publication
                </label>
                <input
                  required
                  onChange={onChanges}
                  class="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  id="grid-last-name"
                  type="file"
                  placeholder="image or video"
                />
                <p class="text-gray-600 text-xs italic">
                  image or video can be selected
                </p>
              </div>
            </section>
            <section>
              <div
                className="w-full md:w-1/2 px-3 mt-6"
                style={{ width: "100%" }}
              >
                <label
                  className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                  for="grid-last-name"
                >
                  Select a file to upload for the publication
                </label>
                <input
                  required
                  class="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 h-64"
                  id="grid-last-name"
                  type="file"
                  onChange={onChanged}
                  placeholder="image or video"
                />
                <p class="text-gray-600 text-xs italic">
                  file can be in .epub or .pdf
                </p>
              </div>
            </section>
          </div>
          <button
            type="submit"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Publish;
